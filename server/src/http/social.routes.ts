import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  HOME_TABLE_INVITE_NOTE,
  Phase,
  isPublicTable,
  isTableInviteNoteId,
  normalizeAvatar,
  roomInviteLink,
  type JoinRoomRequest,
  type JoinRoomResponse,
  type MessengerKind,
  type SocialAccountActionBody,
  type SocialFriendRequestBody,
  type SocialInviteRequestBody,
  type SocialInviteSendResponse,
  type SocialInviteView,
  type SocialListRequest,
  type SocialListResponse,
  type SocialPerson,
  type SocialRequestView,
  type SocialTieStatus,
} from '@secret-hitler/shared';
import { RateLimiter } from '../util/RateLimiter';
import type { RoomRepository } from '../rooms/RoomRepository';
import type { SocketHandler } from '../ws/SocketHandler';
import type { TokenStore } from '../rooms/TokenStore';
import type { GameResultRecorder } from '../history/GameResultRecorder';
import type { GameHistoryStore } from '../history/GameHistoryStore';
import { identifyInitData } from '../bale/initData';
import { messengerKindOf, type BaleRuntime } from '../bale/webhook';
import { isEngineError, SocialBook } from '../social/SocialBook';
import type { StoredTableInvite } from '../social/SocialStore';

const CLIENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOCIAL_LIMIT = 40;
const LIMIT_WINDOW_MS = 60_000;

export interface SocialRouteDeps {
  repo: RoomRepository;
  tokens: TokenStore;
  sockets: SocketHandler;
  recorder: GameResultRecorder;
  history: GameHistoryStore;
  social: SocialBook;
  bale?: BaleRuntime;
  telegram?: BaleRuntime;
}

function isClientId(value: unknown): value is string {
  return typeof value === 'string' && CLIENT_ID.test(value);
}

function configuredMessengers(bale?: BaleRuntime, telegram?: BaleRuntime): BaleRuntime[] {
  return [bale, telegram].filter((runtime): runtime is BaleRuntime => runtime != null);
}

function runtimeOf(
  kind: MessengerKind,
  bale?: BaleRuntime,
  telegram?: BaleRuntime,
): BaleRuntime | undefined {
  return kind === 'telegram' ? telegram : bale;
}

function accountIdOf(
  identified: ReturnType<typeof identifyInitData>,
  clientId: unknown,
): string | null {
  if (identified) return `${identified.kind}:${identified.user.id}`;
  if (isClientId(clientId)) return `client:${clientId}`;
  return null;
}

function personOf(
  accountId: string,
  name: unknown,
  avatar: unknown,
  identified: ReturnType<typeof identifyInitData>,
): SocialPerson | null {
  const resolvedName =
    (typeof name === 'string' && name.trim()) || identified?.user.firstName || '';
  if (!resolvedName) return null;
  return {
    accountId,
    name: resolvedName,
    avatar: normalizeAvatar(typeof avatar === 'number' ? avatar : 0),
  };
}

function inviteView(invite: StoredTableInvite): SocialInviteView {
  return {
    id: invite.id,
    from: invite.from,
    to: invite.to,
    noteId: invite.noteId,
    roomCode: invite.roomCode,
    createdAt: invite.createdAt,
  };
}

function requestView(request: {
  id: string;
  from: SocialPerson;
  to: SocialPerson;
  createdAt: number;
}): SocialRequestView {
  return {
    id: request.id,
    from: request.from,
    to: request.to,
    createdAt: request.createdAt,
  };
}

function socialLink(req: FastifyRequest, code: string, runtime?: BaleRuntime): string {
  const host = typeof req.headers.host === 'string' ? req.headers.host : 'localhost';
  const proto =
    typeof req.headers['x-forwarded-proto'] === 'string' ? req.headers['x-forwarded-proto'] : 'http';
  return roomInviteLink({
    code,
    hostname: host,
    origin: `${proto}://${host}`,
    botUsername: runtime?.botUsername,
    platform: runtime ? messengerKindOf(runtime) : undefined,
    telegramShortName: runtime?.webAppShortName,
  });
}

function fail(reply: FastifyReply, status: number, code: string, error: string) {
  return reply.code(status).send({ error, code });
}

function engineFail(reply: FastifyReply, error: { code: string; message: string }) {
  const status = error.code === 'SOCIAL_LIMIT' || error.code === 'RATE_LIMITED' ? 429 : 400;
  return fail(reply, status, error.code, error.message);
}

export function registerSocialRoutes(app: FastifyInstance, deps: SocialRouteDeps): void {
  const { repo, tokens, sockets, recorder, history, social, bale, telegram } = deps;
  const messengers = configuredMessengers(bale, telegram);
  const limiter = new RateLimiter(SOCIAL_LIMIT, LIMIT_WINDOW_MS);

  const readCaller = (body: {
    clientId?: unknown;
    initData?: unknown;
    name?: unknown;
    avatar?: unknown;
  }) => {
    const identified = identifyInitData(
      typeof body.initData === 'string' ? body.initData : undefined,
      messengers,
    );
    const accountId = accountIdOf(identified, body.clientId);
    const person = accountId ? personOf(accountId, body.name, body.avatar, identified) : null;
    return { identified, accountId, person };
  };

  app.post('/api/social/list', async (req, reply) => {
    if (!limiter.allow(req.ip)) {
      return fail(reply, 429, 'RATE_LIMITED', 'Too many social requests.');
    }
    const body = (req.body ?? {}) as SocialListRequest;
    const { accountId, person } = readCaller(body);
    if (!accountId || !person) {
      return fail(reply, 400, 'AUTH_FAILED', 'A profile is required.');
    }
    const snapshot = await social.snapshot(accountId);
    const mates: Record<string, SocialTieStatus> = {};
    const token = typeof body.token === 'string' ? body.token : '';
    const claim = token ? tokens.lookup(token) : undefined;
    const room = claim ? repo.get(claim.roomId)?.room : undefined;
    if (room) {
      for (const player of room.players) {
        if (player.id === claim?.playerId) continue;
        if (!player.joinKey) {
          mates[player.id] = 'none';
          continue;
        }
        mates[player.id] = await social.tieStatus(accountId, player.joinKey);
      }
    }
    const res: SocialListResponse = {
      friends: snapshot.friends,
      incomingRequests: snapshot.incomingRequests.map(requestView),
      outgoingRequests: snapshot.outgoingRequests.map(requestView),
      incomingInvites: snapshot.incomingInvites.map(inviteView),
      outgoingInvites: snapshot.outgoingInvites.map(inviteView),
      blocked: snapshot.blocked,
      mates,
    };
    return res;
  });

  app.post('/api/social/friends', async (req, reply) => {
    if (!limiter.allow(req.ip)) {
      return fail(reply, 429, 'RATE_LIMITED', 'Too many social requests.');
    }
    const body = (req.body ?? {}) as SocialFriendRequestBody;
    const { accountId, person } = readCaller(body);
    if (!accountId || !person) {
      return fail(reply, 400, 'AUTH_FAILED', 'A profile is required.');
    }
    const playerId = typeof body.playerId === 'string' ? body.playerId : '';
    const targetAccount = typeof body.accountId === 'string' ? body.accountId : '';
    if (Boolean(playerId) === Boolean(targetAccount)) {
      return fail(reply, 400, 'INVALID_ACTION', 'Use playerId or accountId.');
    }
    let to: SocialPerson | null = null;
    if (playerId) {
      const entry = repo.findByPlayerId(playerId);
      const you = entry?.room.players.find((player) => player.joinKey === accountId);
      const target = entry?.room.findPlayer(playerId);
      if (!entry || !you || !target || target.id === you.id) {
        return fail(reply, 400, 'INVALID_ACTION', 'You can only add someone from this table.');
      }
      if (entry.room.phase !== Phase.GameOver) {
        return fail(reply, 400, 'INVALID_ACTION', 'Add friends after the match ends.');
      }
      if (!target.joinKey) {
        return fail(reply, 400, 'INVALID_ACTION', 'That player has no account to add.');
      }
      to = {
        accountId: target.joinKey,
        name: target.name,
        avatar: target.avatar,
      };
    } else {
      if (targetAccount === accountId) {
        return fail(reply, 400, 'INVALID_ACTION', 'You cannot add yourself.');
      }
      if (!(await history.satTogether(accountId, targetAccount))) {
        return fail(reply, 400, 'SOCIAL_STRANGER', 'You can only add someone you sat with.');
      }
      const games = await history.listForAccount(accountId);
      const mate = games
        .flatMap((game) => game.players)
        .find((player) => player.joinKey === targetAccount);
      if (!mate) {
        return fail(reply, 400, 'SOCIAL_STRANGER', 'You can only add someone you sat with.');
      }
      to = {
        accountId: targetAccount,
        name: mate.name,
        avatar: 0,
      };
    }
    if (!to) {
      return fail(reply, 400, 'INVALID_ACTION', 'Use playerId or accountId.');
    }
    const result = await social.requestFriend(person, to);
    if (isEngineError(result)) return engineFail(reply, result);
    return requestView(result);
  });

  app.post('/api/social/friends/:id/accept', async (req, reply) => {
    if (!limiter.allow(req.ip)) {
      return fail(reply, 429, 'RATE_LIMITED', 'Too many social requests.');
    }
    const { accountId } = readCaller((req.body ?? {}) as SocialAccountActionBody);
    if (!accountId) return fail(reply, 400, 'AUTH_FAILED', 'A profile is required.');
    const { id } = req.params as { id: string };
    const error = await social.acceptFriendRequest(id, accountId);
    if (error) return engineFail(reply, error);
    return { ok: true };
  });

  app.post('/api/social/friends/:id/ignore', async (req, reply) => {
    if (!limiter.allow(req.ip)) {
      return fail(reply, 429, 'RATE_LIMITED', 'Too many social requests.');
    }
    const { accountId } = readCaller((req.body ?? {}) as SocialAccountActionBody);
    if (!accountId) return fail(reply, 400, 'AUTH_FAILED', 'A profile is required.');
    const { id } = req.params as { id: string };
    const error = await social.ignoreFriendRequest(id, accountId);
    if (error) return engineFail(reply, error);
    return { ok: true };
  });

  app.post('/api/social/invites', async (req, reply) => {
    if (!limiter.allow(req.ip)) {
      return fail(reply, 429, 'RATE_LIMITED', 'Too many social requests.');
    }
    const body = (req.body ?? {}) as SocialInviteRequestBody;
    const { identified, accountId, person } = readCaller(body);
    if (!accountId || !person) {
      return fail(reply, 400, 'AUTH_FAILED', 'A profile is required.');
    }
    if (typeof body.accountId !== 'string' || !body.accountId) {
      return fail(reply, 400, 'INVALID_ACTION', 'accountId is required.');
    }
    const noteId = isTableInviteNoteId(body.noteId) ? body.noteId : HOME_TABLE_INVITE_NOTE;
    sockets.leaveMatchQueueByJoinKey(accountId);
    const seated = repo.findSeatByJoinKey(accountId);
    if (seated && seated.entry.room.phase !== Phase.Lobby) {
      return fail(reply, 400, 'INVALID_ACTION', 'Finish this table first.');
    }
    const joinRuntime = identified ? runtimeOf(identified.kind, bale, telegram) : undefined;
    let hosted = repo.findHostedLobbyByJoinKey(accountId);
    if (!hosted) {
      if (seated && isPublicTable(seated.entry.room.options)) {
        sockets.dropSeat(seated.entry, seated.playerId);
      }
      hosted = repo.create({
        name: person.name,
        timerEnabled: true,
      });
      sockets.registerEngine(hosted);
      recorder.attach(hosted);
      const host = hosted.engine.addPlayer(person.name, true, person.avatar, accountId);
      if ('code' in host) {
        return fail(reply, 400, host.code, host.message);
      }
      void sockets.persistRoom(hosted.room.id);
    }
    const hostSeat = hosted.room.players.find((player) => player.joinKey === accountId);
    if (!hostSeat) {
      return fail(reply, 400, 'INVALID_ACTION', 'Could not sit at that table.');
    }
    const token = tokens.issue({ roomId: hosted.room.id, playerId: hostSeat.id });
    const createdSeat: JoinRoomResponse = {
      roomId: hosted.room.id,
      code: hosted.room.code,
      shareLink: socialLink(req, hosted.room.code, joinRuntime ?? bale ?? telegram),
      token,
      playerId: hostSeat.id,
    };
    const friends = await social.snapshot(accountId);
    const target =
      friends.friends.find((friend) => friend.accountId === body.accountId) ?? {
        accountId: body.accountId,
        name: body.accountId,
        avatar: 0,
      };
    const result = await social.sendInvite(person, target, noteId, {
      id: hosted.room.id,
      code: hosted.room.code,
    });
    if (isEngineError(result)) return engineFail(reply, result);
    const res: SocialInviteSendResponse = {
      invite: inviteView(result),
      seat: createdSeat,
    };
    return res;
  });

  app.post('/api/social/invites/:id/accept', async (req, reply) => {
    if (!limiter.allow(req.ip)) {
      return fail(reply, 429, 'RATE_LIMITED', 'Too many social requests.');
    }
    const body = (req.body ?? {}) as JoinRoomRequest & SocialAccountActionBody;
    const { identified, accountId, person } = readCaller(body);
    if (!accountId || !person) {
      return fail(reply, 400, 'AUTH_FAILED', 'A profile is required.');
    }
    const { id } = req.params as { id: string };
    const result = await social.acceptInvite(id, accountId);
    if (isEngineError(result)) return engineFail(reply, result);
    const entry = repo.resolve(result.roomCode) ?? repo.get(result.roomId);
    if (!entry || entry.room.phase !== Phase.Lobby) {
      return fail(reply, 404, 'ROOM_NOT_FOUND', 'That table is gone.');
    }
    const joinRuntime = identified ? runtimeOf(identified.kind, bale, telegram) : undefined;
    const already = entry.room.players.find((player) => player.joinKey === accountId);
    if (already) {
      const token = tokens.issue({ roomId: entry.room.id, playerId: already.id });
      const seated: JoinRoomResponse = {
        roomId: entry.room.id,
        code: entry.room.code,
        shareLink: socialLink(req, entry.room.code, joinRuntime ?? bale ?? telegram),
        token,
        playerId: already.id,
      };
      return seated;
    }
    const player = entry.engine.addPlayer(person.name, false, person.avatar, accountId);
    if ('code' in player) {
      const status = player.code === 'ROOM_FULL' ? 409 : 400;
      return fail(reply, status, player.code, player.message);
    }
    const token = tokens.issue({ roomId: entry.room.id, playerId: player.id });
    void sockets.persistRoom(entry.room.id);
    const seated: JoinRoomResponse = {
      roomId: entry.room.id,
      code: entry.room.code,
      shareLink: socialLink(req, entry.room.code, joinRuntime ?? bale ?? telegram),
      token,
      playerId: player.id,
    };
    return seated;
  });

  app.post('/api/social/invites/:id/ignore', async (req, reply) => {
    if (!limiter.allow(req.ip)) {
      return fail(reply, 429, 'RATE_LIMITED', 'Too many social requests.');
    }
    const { accountId } = readCaller((req.body ?? {}) as SocialAccountActionBody);
    if (!accountId) return fail(reply, 400, 'AUTH_FAILED', 'A profile is required.');
    const { id } = req.params as { id: string };
    const error = await social.ignoreInvite(id, accountId);
    if (error) return engineFail(reply, error);
    return { ok: true };
  });
}
