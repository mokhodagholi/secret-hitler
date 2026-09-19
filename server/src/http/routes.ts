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
  MessengerKind,
  ProfileResponse,
  RoomSummary,
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
import {
  ONBOARD_INTENTS,
  ONBOARD_STAGES,
  type OnboardIntent,
  type OnboardStage,
} from '../product/ProductStore';
import { hashPassword, verifyPassword } from './password';
import {
  identifyInitData,
  sanitizeStartParam,
  startParamFromInitData,
} from '../bale/initData';
import { baleUserInOriginChat } from '../bale/groupMember';
import {
  handleMessengerWebhook,
  messengerKindOf,
  registerBaleBodyParser,
  type BaleRuntime,
} from '../bale/webhook';
import { formatSupportLetter, isSupportTopic } from '../bale/support';
import { DEFAULT_ADMIN_USER_ID, isAdminUser, parseAdminUserIds } from '../bale/adminIds';
import { ensureAdminPlayTable } from '../bale/adminPlay';
import { registerSocialRoutes } from './social.routes';
import type { SocialBook } from '../social/SocialBook';
import type { HostedRoomQuota } from '../rooms/HostedRoomQuota';
import { addressToBan } from './firewallBan';

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
  /**
   * Local / test only: `POST /api/play-game` may omit mini-app login and still
   * open the admin test table (same as `/play-game N` in Bale). Never on in
   * production.
   */
  allowDevPlay?: boolean;
  broadcastDelayMs?: number;
  /** Funnel / lobby / blast / match health. */
  product: ProductTracker;
  social: SocialBook;
  /** One open hosted table per address and account. */
  roomQuota: HostedRoomQuota;
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

function requestAddress(req: FastifyRequest): string {
  return addressToBan(req.socket.remoteAddress, req.ip);
}

function bannedReply(reply: FastifyReply) {
  return reply.code(403).send({
    error: 'You cannot open another table.',
    code: 'BANNED',
  });
}

function messengerOnlyReply(reply: FastifyReply) {
  return reply.code(401).send({
    error: 'Open the game from Bale or Telegram.',
    code: 'MESSENGER_ONLY',
  });
}

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

function isOnboardIntent(value: unknown): value is OnboardIntent {
  return typeof value === 'string' && (ONBOARD_INTENTS as readonly string[]).includes(value);
}

function onboardStageOf(value: unknown): OnboardStage | undefined {
  if (typeof value !== 'string') return undefined;
  return (ONBOARD_STAGES as readonly string[]).includes(value)
    ? (value as OnboardStage)
    : undefined;
}

function onboardBeatOf(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return undefined;
  return value;
}

function onboardCountOf(value: unknown): number | undefined {
  if (value !== 5 && value !== 6 && value !== 7 && value !== 8 && value !== 9 && value !== 10) {
    return undefined;
  }
  return value;
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
  const { repo, tokens, sockets, recorder, history, profiles, subscribers, bale, telegram, flags, product, roomQuota } =
    deps;
  const adminUserIds = deps.adminUserIds ?? parseAdminUserIds();
  const allowDevPlay = deps.allowDevPlay === true;
  const tableHooks = {
    sockets,
    recorder,
    adminUserIds,
    subscribers,
    broadcastDelayMs: deps.broadcastDelayMs,
    product,
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
    const rawBody = req.body as { initData?: unknown; startParam?: unknown } | null;
    const initData = typeof rawBody?.initData === 'string' ? rawBody.initData : '';
    const identified = identifyInitData(initData, messengers);
    if (!identified) {
      return reply.code(401).send({ error: 'Invalid mini-app login', code: 'AUTH_FAILED' });
    }
    await subscribers.upsert(identified.kind, String(identified.user.id));
    const bodyStartParam =
      typeof rawBody?.startParam === 'string' ? sanitizeStartParam(rawBody.startParam) : null;
    product.miniappOpened(
      identified.kind,
      identified.user.id,
      startParamFromInitData(initData) ?? bodyStartParam,
    );
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
    let adminUserId: number | null = null;
    if (identified) {
      if (!isAdminUser(identified.user.id, adminUserIds)) {
        return reply.code(403).send({ error: 'Not allowed', code: 'AUTH_FAILED' });
      }
      adminUserId = identified.user.id;
    } else if (allowDevPlay) {
      // Browser localhost has no signed initData — same table as `/play-game 1`.
      adminUserId = DEFAULT_ADMIN_USER_ID;
    } else {
      return reply.code(401).send({ error: 'Invalid mini-app login', code: 'AUTH_FAILED' });
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
      userId: adminUserId,
    });
    if ('error' in opened) {
      return reply.code(400).send({ error: opened.error, code: 'INVALID_ACTION' });
    }
    const entry = repo.getByCode(opened.code);
    const player = entry?.room.players[seat - 1];
    if (!entry || !player) {
      return reply.code(404).send({ error: 'Seat not found', code: 'ROOM_NOT_FOUND' });
    }
    const joinRuntime = identified
      ? runtimeOf(identified.kind, bale, telegram)
      : undefined;
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
    if (!flags.browserPlay && !identified) return messengerOnlyReply(reply);
    const hostRuntime = identified
      ? runtimeOf(identified.kind, bale, telegram)
      : undefined;
    const previousSeat = reservedSeat(identified, hostRuntime);
    const joinKey = joinBanKey(identified, body.clientId);
    const address = requestAddress(req);
    if (roomQuota.isBlocked(address, joinKey)) return bannedReply(reply);

    if (flags.publicTable) {
      const seated = sockets.sitPublicLobby({
        name: body.hostName,
        avatar: body.avatar,
        joinKey,
      });
      if ('error' in seated) {
        const status =
          seated.error.code === 'ROOM_FULL'
            ? 409
            : seated.error.code === 'BANNED'
              ? 403
              : 400;
        return reply.code(status).send({ error: seated.error.message, code: seated.error.code });
      }
      const salon = repo.get(seated.roomId);
      if (salon) {
        vacatePreviousSeat(sockets, repo, previousSeat, salon.room.id);
        bindMessengerSeat(
          hostRuntime,
          identified,
          seated.playerId,
          salon.room.id,
          salon.room.code,
          salon.room.options.name,
        );
        product.seated(salon.room, joinKey);
      }
      const salonRes: CreateRoomResponse = {
        roomId: seated.roomId,
        code: seated.code,
        shareLink: requestInviteLink(req, seated.code, inviteRuntime(hostRuntime, bale, telegram)),
        token: seated.token,
        playerId: seated.playerId,
      };
      return reply.code(201).send(salonRes);
    }

    const entry = repo.create({
      name: body.name,
      passwordHash,
      maxPlayers: body.options?.maxPlayers,
      timerEnabled: body.options?.timerEnabled,
      confirmActions: body.options?.confirmActions,
    });
    const claim = roomQuota.claim(address, joinKey, entry.room.id);
    if (claim) {
      sockets.destroyRoomByCode(entry.room.code);
      if (claim.bans.length > 0 && roomQuota.onBanned) {
        try {
          await roomQuota.onBanned(claim.bans);
        } catch (error) {
          req.log.error({ err: error }, 'Failed to persist create ban');
        }
      }
      if (claim.bans.length > 0) return bannedReply(reply);
      return reply.code(409).send({
        error: 'You already have a table open.',
        code: 'ALREADY_HOSTING',
      });
    }
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

  // Join list: salon plus open hosted lobbies while publicTable is on.
  app.get('/api/rooms', async () => sockets.joinList());

  /** Proxies and phones freeze a silent stream; comment frames keep the pipe open. */
  const JOIN_LIST_HEARTBEAT_MS = 25_000;

  app.get('/api/rooms/stream', (request, reply) => {
    reply.hijack();
    request.raw.setTimeout(0);
    request.raw.socket.setTimeout(0);
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const write = (chunk: string): void => {
      if (!reply.raw.writableEnded) reply.raw.write(chunk);
    };
    const send = (rooms: RoomSummary[]): void => {
      write(`data: ${JSON.stringify(rooms)}\n\n`);
    };
    const unwatch = sockets.watchJoinList(send);
    const heartbeat = setInterval(() => write(': keep-alive\n\n'), JOIN_LIST_HEARTBEAT_MS);
    if (typeof heartbeat === 'object' && 'unref' in heartbeat) heartbeat.unref();

    let closed = false;
    const close = (): void => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      unwatch();
    };
    request.raw.on('close', close);
    reply.raw.on('close', close);
  });

  app.get('/api/match', async (): Promise<MatchOccupancy> => {
    if (!flags.publicTable) return { waiting: 0, max: 10 };
    return sockets.matchStatus();
  });

  app.post('/api/match/queue', async (_req, reply) => {
    return reply
      .code(404)
      .send({ error: 'Find Match is not enabled.', code: 'ROOM_NOT_FOUND' });
  });

  app.post('/api/match/leave', async (req, reply) => {
    const body = (req.body ?? {}) as MatchLeaveRequest;
    if (!body.token?.trim()) {
      return reply.code(400).send({ error: 'token is required' });
    }
    sockets.leaveMatchQueue(body.token);
    return reply.send({ ok: true });
  });

  // Finished games are per player. There is no public list — it used to
  // include every seat's messenger id.
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

    const identified = identifyInitData(body.initData, messengers);
    if (!flags.browserPlay && !identified) return messengerOnlyReply(reply);
    const joinRuntime = identified
      ? runtimeOf(identified.kind, bale, telegram)
      : undefined;
    const joinKey = joinBanKey(identified, body.clientId);
    if (roomQuota.isBlocked(requestAddress(req), joinKey)) return bannedReply(reply);
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

    const publicSalon = isPublicTable(entry.room.options);
    const passwordOk =
      publicSalon || verifyPassword(body.password ?? '', entry.room.passwordHash);
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
    if (isPublicTable(entry.room.options)) {
      product.seated(entry.room, joinKey);
    } else {
      product.hostedRoomJoined(entry.room, joinKey);
    }
    const res: JoinRoomResponse = {
      roomId: entry.room.id,
      code: entry.room.code,
      shareLink: requestInviteLink(req, entry.room.code, inviteRuntime(joinRuntime, bale, telegram)),
      token,
      playerId: player.id,
    };
    return reply.send(res);
  });

  app.post('/api/product/own-room', async (req, reply) => {
    const body = (req.body ?? {}) as {
      intent?: string;
      initData?: string;
      clientId?: string;
    };
    if (body.intent !== 'prompt' && body.intent !== 'want') {
      return reply.code(400).send({ error: 'intent is required' });
    }
    const identified = identifyInitData(body.initData, messengers);
    const userKey = joinBanKey(identified, body.clientId);
    if (body.intent === 'prompt') product.ownRoomPrompt(userKey);
    else product.ownRoomWant(userKey);
    return reply.send({ ok: true });
  });

  app.post('/api/product/lobby-nudge', async (req, reply) => {
    const body = (req.body ?? {}) as {
      intent?: string;
      initData?: string;
      clientId?: string;
      fromCode?: string;
      toCode?: string;
      seats?: number;
    };
    if (body.intent !== 'prompt' && body.intent !== 'join') {
      return reply.code(400).send({ error: 'intent is required' });
    }
    const identified = identifyInitData(body.initData, messengers);
    const userKey = joinBanKey(identified, body.clientId);
    const fields = {
      fromCode: typeof body.fromCode === 'string' ? body.fromCode : undefined,
      toCode: typeof body.toCode === 'string' ? body.toCode : undefined,
      seats: typeof body.seats === 'number' ? body.seats : undefined,
    };
    if (body.intent === 'prompt') product.lobbyNudgePrompt(userKey, fields);
    else product.lobbyNudgeJoin(userKey, fields);
    return reply.send({ ok: true });
  });

  app.post('/api/product/onboard', async (req, reply) => {
    const body = (req.body ?? {}) as {
      intent?: unknown;
      initData?: string;
      clientId?: string;
      stage?: unknown;
      beat?: unknown;
      count?: unknown;
    };
    if (!isOnboardIntent(body.intent)) {
      return reply.code(400).send({ error: 'intent is required' });
    }
    const identified = identifyInitData(body.initData, messengers);
    const userKey = joinBanKey(identified, body.clientId);
    product.onboard(body.intent, userKey, {
      stage: onboardStageOf(body.stage),
      beat: onboardBeatOf(body.beat),
      count: onboardCountOf(body.count),
    });
    return reply.send({ ok: true });
  });

  registerSocialRoutes(app, {
    repo,
    tokens,
    sockets,
    history,
    social: deps.social,
    bale,
    telegram,
    browserPlay: flags.browserPlay,
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
