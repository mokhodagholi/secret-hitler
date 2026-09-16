import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  FeatureFlags,
  HistoryMatchView,
  HistoryMineRequest,
  JoinRoomRequest,
  JoinRoomResponse,
  MatchLeaveRequest,
  MatchOccupancy,
  MatchQueueRequest,
  MatchQueueResponse,
  MessengerKind,
  ProfileResponse,
  SaveProfileRequest,
} from '@secret-hitler/shared';
import { ADMIN_PLAY_SEAT_COUNT, isPublicTable, normalizeAvatar, roomInviteLink, toFlagsResponse } from '@secret-hitler/shared';
import { RateLimiter } from '../util/RateLimiter';
import type { RoomRepository } from '../rooms/RoomRepository';
import type { SocketHandler } from '../ws/SocketHandler';
import type { TokenStore } from '../rooms/TokenStore';
import type { GameResultRecorder } from '../history/GameResultRecorder';
import type { GameHistoryStore, SavedGame } from '../history/GameHistoryStore';
import type { ProfileStore } from '../profiles/ProfileStore';
import type { BotSubscriberStore } from '../bale/BotSubscriberStore';
import type { ProductTracker } from '../product/ProductTracker';
import { hashPassword, verifyPassword } from './password';
import { identifyInitData } from '../bale/initData';
import { baleUserInOriginChat } from '../bale/groupMember';
import {
  handleMessengerWebhook,
  messengerKindOf,
  registerBaleBodyParser,
  type BaleRuntime,
} from '../bale/webhook';
import { formatSupportLetter, isSupportTopic } from '../bale/support';
import { isAdminUser, parseAdminUserIds } from '../bale/adminIds';
import { ensureAdminPlayTable } from '../bale/adminPlay';
import { registerSocialRoutes } from './social.routes';
import type { SocialBook } from '../social/SocialBook';

export interface RouteDeps {
  repo: RoomRepository;
  tokens: TokenStore;
  sockets: SocketHandler;
  /** Persists finished games. */
  recorder: GameResultRecorder;
  /** Reads finished games for the history endpoint. */
  history: GameHistoryStore;
  /** Chosen player-card portraits. */
  profiles: ProfileStore;
  /** People who opened a private chat with the bot. */
  subscribers: BotSubscriberStore;
  publicUrl?: string;
  bale?: BaleRuntime;
  telegram?: BaleRuntime;
  flags: FeatureFlags;
  adminUserIds?: ReadonlySet<number>;
  broadcastDelayMs?: number;
  /** Funnel / lobby / blast / match health. */
  product: ProductTracker;
  social: SocialBook;
}

/** Per-IP budgets: room creation is expensive, join attempts guard passwords. */
const CREATE_LIMIT = 5;
const JOIN_LIMIT = 10;
const PROFILE_LIMIT = 20;
const SUPPORT_LIMIT = 3;
const LIMIT_WINDOW_MS = 60_000;
const SUPPORT_DESCRIPTION_MAX = 2000;
const SUPPORT_DESCRIPTION_MIN = 3;

const CLIENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isClientId(value: unknown): value is string {
  return typeof value === 'string' && CLIENT_ID.test(value);
}

function joinBanKey(
  identified: ReturnType<typeof identifyInitData>,
  clientId: unknown,
): string | null {
  if (identified) return `${identified.kind}:${identified.user.id}`;
  if (isClientId(clientId)) return `client:${clientId}`;
  return null;
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

function inviteRuntime(
  identified: BaleRuntime | undefined,
  bale?: BaleRuntime,
  telegram?: BaleRuntime,
): BaleRuntime | undefined {
  return identified ?? bale ?? telegram;
}

/** Registers room HTTP endpoints under `/api`. */
export function registerRoutes(app: FastifyInstance, deps: RouteDeps): void {
  const { repo, tokens, sockets, recorder, history, profiles, subscribers, bale, telegram, flags, product } =
    deps;
  const adminUserIds = deps.adminUserIds ?? parseAdminUserIds();
  const tableHooks = {
    sockets,
    recorder,
    adminUserIds,
    subscribers,
    broadcastDelayMs: deps.broadcastDelayMs,
    product,
    roomPassword: flags.roomPassword,
  };
  const messengers = configuredMessengers(bale, telegram);
  registerBaleBodyParser(app);
  const createLimiter = new RateLimiter(CREATE_LIMIT, LIMIT_WINDOW_MS);
  const joinLimiter = new RateLimiter(JOIN_LIMIT, LIMIT_WINDOW_MS);
  const profileLimiter = new RateLimiter(PROFILE_LIMIT, LIMIT_WINDOW_MS);
  const supportLimiter = new RateLimiter(SUPPORT_LIMIT, LIMIT_WINDOW_MS);

  const handleAuth = async (req: FastifyRequest, reply: FastifyReply) => {
    if (messengers.length === 0) {
      return reply
        .code(503)
        .send({ error: 'Mini-app login is not configured', code: 'MINIAPP_DISABLED' });
    }
    const initData =
      typeof (req.body as { initData?: unknown } | null)?.initData === 'string'
        ? (req.body as { initData: string }).initData
        : '';
    const identified = identifyInitData(initData, messengers);
    if (!identified) {
      return reply.code(401).send({ error: 'Invalid mini-app login', code: 'AUTH_FAILED' });
    }
    await subscribers.upsert(identified.kind, String(identified.user.id));
    product.miniappOpened(identified.kind, identified.user.id);
    const avatar = await profiles.get(
      identified.kind === 'telegram'
        ? { telegramUserId: String(identified.user.id) }
        : { baleUserId: String(identified.user.id) },
    );
    return {
      id: identified.user.id,
      firstName: identified.user.firstName,
      avatar,
      platform: identified.kind,
    };
  };

  app.get('/api/flags', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store');
    return toFlagsResponse(flags);
  });

  app.post('/api/auth/miniapp', handleAuth);
  app.post('/api/auth/bale', handleAuth);
  app.post('/api/auth/telegram', handleAuth);

  app.post('/api/support', async (req, reply) => {
    if (messengers.length === 0) {
      return reply
        .code(503)
        .send({ error: 'Mini-app login is not configured', code: 'MINIAPP_DISABLED' });
    }
    if (!supportLimiter.allow(req.ip)) {
      return reply
        .code(429)
        .send({ error: 'Too many letters. Try again shortly.', code: 'RATE_LIMITED' });
    }

    const body = (req.body ?? {}) as {
      topic?: unknown;
      description?: unknown;
      clientId?: unknown;
      initData?: unknown;
    };
    const description =
      typeof body.description === 'string' ? body.description.trim() : '';
    if (!isSupportTopic(body.topic) || description.length < SUPPORT_DESCRIPTION_MIN) {
      return reply.code(400).send({ error: 'topic and description are required' });
    }

    const identified = identifyInitData(
      typeof body.initData === 'string' ? body.initData : undefined,
      messengers,
    );
    const desk =
      (identified ? runtimeOf(identified.kind, bale, telegram) : undefined) ??
      bale ??
      telegram;
    if (desk?.supportChatId == null) {
      return reply
        .code(503)
        .send({ error: 'Support desk is not configured', code: 'SUPPORT_DISABLED' });
    }
    const clientId = isClientId(body.clientId) ? body.clientId : null;
    const senderId = identified ? String(identified.user.id) : clientId;
    if (!senderId) {
      return reply.code(400).send({ error: 'sender id is required' });
    }

    const text = formatSupportLetter({
      topic: body.topic,
      description: description.slice(0, SUPPORT_DESCRIPTION_MAX),
      senderId,
    });

    try {
      await desk.bot.sendMessage({ chat_id: desk.supportChatId, text });
    } catch (error) {
      req.log.error(error, 'Failed to send support letter');
      return reply.code(502).send({ error: 'Failed to deliver the letter' });
    }

    return { ok: true };
  });

  app.put('/api/profile', async (req, reply) => {
    if (!profileLimiter.allow(req.ip)) {
      return reply
        .code(429)
        .send({ error: 'Too many profile saves. Try again shortly.', code: 'RATE_LIMITED' });
    }
    const body = (req.body ?? {}) as SaveProfileRequest;
    if (!isClientId(body.clientId) || typeof body.avatar !== 'number') {
      return reply.code(400).send({ error: 'avatar and clientId are required' });
    }
    const identified = identifyInitData(body.initData, messengers);
    const avatar = await profiles.upsert(
      {
        clientId: body.clientId,
        baleUserId:
          identified?.kind === 'bale' ? String(identified.user.id) : undefined,
        telegramUserId:
          identified?.kind === 'telegram' ? String(identified.user.id) : undefined,
      },
      normalizeAvatar(body.avatar),
    );
    const res: ProfileResponse = { avatar };
    return res;
  });

  app.get('/api/profile', async (req, reply) => {
    const clientId = (req.query as { clientId?: string }).clientId;
    if (!isClientId(clientId)) {
      return reply.code(400).send({ error: 'clientId is required' });
    }
    const avatar = await profiles.get({ clientId });
    if (avatar == null) {
      return reply.code(404).send({ error: 'Profile not found' });
    }
    const res: ProfileResponse = { avatar };
    return res;
  });

  app.post('/api/play-game', async (req, reply) => {
    const body = (req.body ?? {}) as {
      initData?: unknown;
      code?: unknown;
      seat?: unknown;
    };
    const identified = identifyInitData(
      typeof body.initData === 'string' ? body.initData : undefined,
      messengers,
    );
    if (!identified) {
      return reply.code(401).send({ error: 'Invalid mini-app login', code: 'AUTH_FAILED' });
    }
    if (!isAdminUser(identified.user.id, adminUserIds)) {
      return reply.code(403).send({ error: 'Not allowed', code: 'AUTH_FAILED' });
    }
    const seat =
      typeof body.seat === 'number' ? body.seat : Number.parseInt(String(body.seat ?? ''), 10);
    if (!Number.isInteger(seat) || seat < 1 || seat > ADMIN_PLAY_SEAT_COUNT) {
      return reply.code(400).send({ error: 'Invalid seat', code: 'INVALID_ACTION' });
    }
    const opened = ensureAdminPlayTable({
      repo,
      sockets,
      recorder,
      userId: identified.user.id,
    });
    if ('error' in opened) {
      return reply.code(400).send({ error: opened.error, code: 'INVALID_ACTION' });
    }
    const entry = repo.getByCode(opened.code);
    const player = entry?.room.players[seat - 1];
    if (!entry || !player) {
      return reply.code(404).send({ error: 'Seat not found', code: 'ROOM_NOT_FOUND' });
    }
    const joinRuntime = runtimeOf(identified.kind, bale, telegram);
    const token = tokens.issue({ roomId: entry.room.id, playerId: player.id });
    const res: JoinRoomResponse = {
      roomId: entry.room.id,
      code: entry.room.code,
      shareLink: requestInviteLink(
        req,
        entry.room.code,
        inviteRuntime(joinRuntime, bale, telegram),
      ),
      token,
      playerId: player.id,
    };
    return res;
  });

  app.post('/api/bale/webhook', async (req, reply) => {
    return handleMessengerWebhook(req, reply, repo, bale, tableHooks);
  });
  app.post('/api/bale/webhook/:secret', async (req, reply) => {
    return handleMessengerWebhook(req, reply, repo, bale, tableHooks);
  });
  app.post('/api/telegram/webhook', async (req, reply) => {
    return handleMessengerWebhook(req, reply, repo, telegram, tableHooks);
  });
  app.post('/api/telegram/webhook/:secret', async (req, reply) => {
    return handleMessengerWebhook(req, reply, repo, telegram, tableHooks);
  });

  // Create a room and seat the host.
  app.post('/api/rooms', async (req, reply) => {
    if (!createLimiter.allow(req.ip)) {
      return reply
        .code(429)
        .send({ error: 'Too many rooms created. Try again shortly.', code: 'RATE_LIMITED' });
    }
    const body = (req.body ?? {}) as CreateRoomRequest;
    if (!body.name?.trim() || !body.hostName?.trim()) {
      return reply.code(400).send({ error: 'name and hostName are required' });
    }

    const passwordHash =
      flags.roomPassword && body.password?.trim()
        ? hashPassword(body.password.trim())
        : null;

    const identified = identifyInitData(body.initData, messengers);
    const hostRuntime = identified
      ? runtimeOf(identified.kind, bale, telegram)
      : undefined;
    const previousSeat = reservedSeat(identified, hostRuntime);

    const entry = repo.create({
      name: body.name,
      passwordHash,
      maxPlayers: body.options?.maxPlayers,
      timerEnabled: body.options?.timerEnabled,
      confirmActions: body.options?.confirmActions,
    });
    sockets.registerEngine(entry);
    recorder.attach(entry);

    const host = entry.engine.addPlayer(
      body.hostName,
      true,
      body.avatar,
      joinBanKey(identified, body.clientId),
    );
    if ('code' in host) {
      return reply.code(400).send({ error: host.message });
    }

    const token = tokens.issue({ roomId: entry.room.id, playerId: host.id });
    void sockets.persistRoom(entry.room.id);
    vacatePreviousSeat(sockets, repo, previousSeat, entry.room.id);
    bindMessengerSeat(hostRuntime, identified, host.id, entry.room.id, entry.room.code, entry.room.options.name);
    product.hostedRoomCreated(entry.room, joinBanKey(identified, body.clientId));
    const res: CreateRoomResponse = {
      roomId: entry.room.id,
      code: entry.room.code,
      shareLink: requestInviteLink(req, entry.room.code, inviteRuntime(hostRuntime, bale, telegram)),
      token,
      playerId: host.id,
    };
    return reply.code(201).send(res);
  });

  // List public, joinable hosted rooms. Find Match is a queue, not this list.
  app.get('/api/rooms', async () => {
    sockets.ensurePublicLobby();
    return repo.listPublic();
  });

  app.get('/api/match', async (): Promise<MatchOccupancy> => {
    if (!flags.publicTable) return { waiting: 0, max: 6 };
    return sockets.matchStatus();
  });

  app.post('/api/match/queue', async (req, reply) => {
    if (!flags.publicTable) {
      return reply
        .code(404)
        .send({ error: 'Find Match is not enabled.', code: 'ROOM_NOT_FOUND' });
    }
    if (!joinLimiter.allow(req.ip)) {
      return reply
        .code(429)
        .send({ error: 'Too many join attempts. Try again shortly.', code: 'RATE_LIMITED' });
    }
    const body = (req.body ?? {}) as MatchQueueRequest;
    if (!body.name?.trim()) {
      return reply.code(400).send({ error: 'name is required' });
    }
    const identified = identifyInitData(body.initData, messengers);
    const joinRuntime = identified
      ? runtimeOf(identified.kind, bale, telegram)
      : undefined;
    const joinKey = joinBanKey(identified, body.clientId);
    const previous = reservedSeat(identified, joinRuntime);
    vacatePreviousSeat(sockets, repo, previous, '');
    const queued = sockets.enqueueMatch({
      name: body.name,
      avatar: body.avatar,
      joinKey,
    });
    product.findMatchQueued(joinKey);
    const res: MatchQueueResponse = queued;
    return reply.send(res);
  });

  app.post('/api/match/leave', async (req, reply) => {
    const body = (req.body ?? {}) as MatchLeaveRequest;
    if (!body.token?.trim()) {
      return reply.code(400).send({ error: 'token is required' });
    }
    sockets.leaveMatchQueue(body.token);
    return reply.send({ ok: true });
  });

  // Recent finished games.
  app.get('/api/history', async (req) => {
    const limit = Number((req.query as { limit?: string }).limit) || undefined;
    return history.listRecent(limit);
  });

  app.post('/api/history/mine', async (req, reply) => {
    if (!profileLimiter.allow(req.ip)) {
      return reply
        .code(429)
        .send({ error: 'Too many profile requests. Try again shortly.', code: 'RATE_LIMITED' });
    }
    const body = (req.body ?? {}) as HistoryMineRequest;
    const identified = identifyInitData(
      typeof body.initData === 'string' ? body.initData : undefined,
      messengers,
    );
    const accountId = joinBanKey(identified, body.clientId);
    if (!accountId) {
      return reply.code(400).send({ error: 'A profile is required.', code: 'AUTH_FAILED' });
    }
    const games = await history.listForAccount(accountId);
    return games.map((game) => historyMatchView(game, accountId));
  });

  // Join an existing room by id or code.
  app.post('/api/rooms/:idOrCode/join', async (req, reply) => {
    if (!joinLimiter.allow(req.ip)) {
      return reply
        .code(429)
        .send({ error: 'Too many join attempts. Try again shortly.', code: 'RATE_LIMITED' });
    }
    const { idOrCode } = req.params as { idOrCode: string };
    const body = (req.body ?? {}) as JoinRoomRequest;
    if (!body.name?.trim()) {
      return reply.code(400).send({ error: 'name is required' });
    }

    const entry = repo.resolve(idOrCode);
    if (!entry) {
      return reply.code(404).send({ error: 'Room not found', code: 'ROOM_NOT_FOUND' });
    }
    if (isPublicTable(entry.room.options)) {
      return reply
        .code(403)
        .send({ error: 'This table is reserved.', code: 'INVALID_ACTION' });
    }

    const identified = identifyInitData(body.initData, messengers);
    const joinRuntime = identified
      ? runtimeOf(identified.kind, bale, telegram)
      : undefined;
    const joinKey = joinBanKey(identified, body.clientId);
    if (joinKey && entry.room.bannedJoinKeys.has(joinKey)) {
      return reply
        .code(403)
        .send({ error: 'You cannot sit at this table.', code: 'BANNED' });
    }
    const reserved = reservedSeat(identified, joinRuntime);
    if (reserved && reserved.roomId === entry.room.id) {
      const token = tokens.issue({ roomId: entry.room.id, playerId: reserved.playerId });
      return reply.send({
        roomId: entry.room.id,
        code: entry.room.code,
        shareLink: requestInviteLink(req, entry.room.code, inviteRuntime(joinRuntime, bale, telegram)),
        token,
        playerId: reserved.playerId,
      } satisfies JoinRoomResponse);
    }

    const passwordOk = verifyPassword(body.password ?? '', entry.room.passwordHash);
    const originPlatform = entry.room.options.originPlatform ?? 'bale';
    const originRuntime = runtimeOf(originPlatform, bale, telegram);
    const inOriginGroup =
      identified != null &&
      identified.kind === originPlatform &&
      (await baleUserInOriginChat(
        originRuntime?.bot,
        entry.room.options.originChatId,
        identified.user.id,
      ));
    if (!passwordOk && !inOriginGroup) {
      return reply.code(403).send({ error: 'Wrong password', code: 'WRONG_PASSWORD' });
    }

    const player = entry.engine.addPlayer(body.name, false, body.avatar, joinKey);
    if ('code' in player) {
      const status =
        player.code === 'ROOM_FULL' ? 409 : player.code === 'BANNED' ? 403 : 400;
      return reply.code(status).send({ error: player.message, code: player.code });
    }

    const token = tokens.issue({ roomId: entry.room.id, playerId: player.id });
    void sockets.persistRoom(entry.room.id);
    vacatePreviousSeat(sockets, repo, reserved, entry.room.id);
    bindMessengerSeat(
      joinRuntime,
      identified,
      player.id,
      entry.room.id,
      entry.room.code,
      entry.room.options.name,
    );
    product.hostedRoomJoined(entry.room, joinKey);
    const res: JoinRoomResponse = {
      roomId: entry.room.id,
      code: entry.room.code,
      shareLink: requestInviteLink(req, entry.room.code, inviteRuntime(joinRuntime, bale, telegram)),
      token,
      playerId: player.id,
    };
    return reply.send(res);
  });

  registerSocialRoutes(app, {
    repo,
    tokens,
    sockets,
    history,
    social: deps.social,
    bale,
    telegram,
  });
}

function reservedSeat(
  identified: ReturnType<typeof identifyInitData>,
  runtime: BaleRuntime | undefined,
): { roomId: string; playerId: string } | undefined {
  if (!identified || !runtime) return undefined;
  return runtime.seats.get(identified.user.id, identified.kind);
}

/** Find Game of a different table must drop the previous messenger seat, not keep both. */
function vacatePreviousSeat(
  sockets: SocketHandler,
  repo: RoomRepository,
  previous: { roomId: string; playerId: string } | undefined,
  nextRoomId: string,
): void {
  if (!previous) return;
  if (nextRoomId && previous.roomId === nextRoomId) return;
  const old = repo.get(previous.roomId);
  if (!old) return;
  sockets.dropSeat(old, previous.playerId);
}

function bindMessengerSeat(
  runtime: BaleRuntime | undefined,
  identified: ReturnType<typeof identifyInitData>,
  playerId: string,
  roomId: string,
  code: string,
  roomName: string,
): void {
  if (!runtime || !identified) return;
  runtime.seats.occupy(
    identified.user.id,
    { roomId, code, playerId, roomName },
    identified.kind,
  );
}

function historyMatchView(game: SavedGame, accountId: string): HistoryMatchView {
  const you = game.players.find((player) => player.joinKey === accountId);
  return {
    id: game.id,
    winner: game.winner,
    playerCount: game.playerCount,
    endedAt: game.endedAt,
    youWon: you?.won ?? false,
    players: game.players.map((player) => ({
      name: player.name,
      role: player.role,
      seat: player.seat,
      won: player.won,
      you: player.joinKey === accountId,
      accountId: player.joinKey && player.joinKey !== accountId ? player.joinKey : null,
    })),
  };
}

function requestInviteLink(
  req: FastifyRequest,
  code: string,
  runtime?: BaleRuntime,
): string {
  const host = typeof req.headers.host === 'string' ? req.headers.host : 'localhost';
  const proto = typeof req.headers['x-forwarded-proto'] === 'string'
    ? req.headers['x-forwarded-proto']
    : 'http';
  return roomInviteLink({
    code,
    hostname: host,
    origin: `${proto}://${host}`,
    botUsername: runtime?.botUsername,
    platform: runtime ? messengerKindOf(runtime) : undefined,
    telegramShortName: runtime?.webAppShortName,
  });
}
