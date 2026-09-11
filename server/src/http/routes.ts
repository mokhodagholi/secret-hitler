import type { FastifyInstance, FastifyRequest } from 'fastify';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  FeatureFlags,
  JoinRoomRequest,
  JoinRoomResponse,
  ProfileResponse,
  SaveProfileRequest,
} from '@secret-hitler/shared';
import { normalizeAvatar, toFlagsResponse } from '@secret-hitler/shared';
import { RateLimiter } from '../util/RateLimiter';
import type { RoomRepository } from '../rooms/RoomRepository';
import type { SocketHandler } from '../ws/SocketHandler';
import type { TokenStore } from '../rooms/TokenStore';
import type { GameResultRecorder } from '../history/GameResultRecorder';
import type { GameHistoryStore } from '../history/GameHistoryStore';
import type { ProfileStore } from '../profiles/ProfileStore';
import { hashPassword, verifyPassword } from './password';
import { validateBaleInitData } from '../bale/initData';
import { handleBaleWebhook, type BaleRuntime } from '../bale/webhook';
import { formatSupportLetter, isSupportTopic } from '../bale/support';

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
  publicUrl?: string;
  bale?: BaleRuntime;
  flags: FeatureFlags;
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

/** Registers room HTTP endpoints under `/api`. */
export function registerRoutes(app: FastifyInstance, deps: RouteDeps): void {
  const { repo, tokens, sockets, recorder, history, profiles, publicUrl, bale, flags } =
    deps;
  const createLimiter = new RateLimiter(CREATE_LIMIT, LIMIT_WINDOW_MS);
  const joinLimiter = new RateLimiter(JOIN_LIMIT, LIMIT_WINDOW_MS);
  const profileLimiter = new RateLimiter(PROFILE_LIMIT, LIMIT_WINDOW_MS);
  const supportLimiter = new RateLimiter(SUPPORT_LIMIT, LIMIT_WINDOW_MS);

  app.get('/api/flags', async () => toFlagsResponse(flags));

  app.post('/api/auth/bale', async (req, reply) => {
    if (!bale) {
      return reply.code(503).send({ error: 'Bale bot is not configured', code: 'BALE_DISABLED' });
    }
    const initData =
      typeof (req.body as { initData?: unknown } | null)?.initData === 'string'
        ? (req.body as { initData: string }).initData
        : '';
    const user = validateBaleInitData(initData, bale.botToken);
    if (!user) {
      return reply.code(401).send({ error: 'Invalid Bale login', code: 'AUTH_FAILED' });
    }
    const avatar = await profiles.get({
      baleUserId: String(user.id),
    });
    return { id: user.id, firstName: user.firstName, avatar };
  });

  app.post('/api/support', async (req, reply) => {
    if (!bale) {
      return reply.code(503).send({ error: 'Bale bot is not configured', code: 'BALE_DISABLED' });
    }
    if (bale.supportChatId == null) {
      return reply
        .code(503)
        .send({ error: 'Support desk is not configured', code: 'SUPPORT_DISABLED' });
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

    const baleUser =
      typeof body.initData === 'string'
        ? validateBaleInitData(body.initData, bale.botToken)
        : null;
    const clientId = isClientId(body.clientId) ? body.clientId : null;
    const senderId = baleUser ? String(baleUser.id) : clientId;
    if (!senderId) {
      return reply.code(400).send({ error: 'sender id is required' });
    }

    const text = formatSupportLetter({
      topic: body.topic,
      description: description.slice(0, SUPPORT_DESCRIPTION_MAX),
      senderId,
    });

    try {
      await bale.bot.sendMessage({ chat_id: bale.supportChatId, text });
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
    const baleUser = body.initData && bale
      ? validateBaleInitData(body.initData, bale.botToken)
      : null;
    const avatar = await profiles.upsert(
      {
        clientId: body.clientId,
        baleUserId: baleUser ? String(baleUser.id) : undefined,
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

  app.post('/api/bale/webhook', async (req, reply) => {
    return handleBaleWebhook(req, reply, repo, bale);
  });
  app.post('/api/bale/webhook/:secret', async (req, reply) => {
    return handleBaleWebhook(req, reply, repo, bale);
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

    const passwordHash = body.password?.trim()
      ? hashPassword(body.password.trim())
      : null;

    const entry = repo.create({
      name: body.name,
      passwordHash,
      maxPlayers: body.options?.maxPlayers,
      timerEnabled: body.options?.timerEnabled,
      confirmActions: body.options?.confirmActions,
    });
    sockets.registerEngine(entry);
    recorder.attach(entry);

    const host = entry.engine.addPlayer(body.hostName, true, body.avatar);
    if ('code' in host) {
      return reply.code(400).send({ error: host.message });
    }

    const token = tokens.issue({ roomId: entry.room.id, playerId: host.id });
    void sockets.persistRoom(entry.room.id);
    bindBaleSeat(bale, body.initData, host.id, entry.room.id, entry.room.code, entry.room.options.name);
    const res: CreateRoomResponse = {
      roomId: entry.room.id,
      code: entry.room.code,
      shareLink: shareLink(req, entry.room.code, publicUrl),
      token,
      playerId: host.id,
    };
    return reply.code(201).send(res);
  });

  // List public, joinable rooms.
  app.get('/api/rooms', async () => repo.listPublic());

  // Recent finished games.
  app.get('/api/history', async (req) => {
    const limit = Number((req.query as { limit?: string }).limit) || undefined;
    return history.listRecent(limit);
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
    if (!verifyPassword(body.password ?? '', entry.room.passwordHash)) {
      return reply.code(403).send({ error: 'Wrong password', code: 'WRONG_PASSWORD' });
    }

    const player = entry.engine.addPlayer(body.name, false, body.avatar);
    if ('code' in player) {
      const status = player.code === 'ROOM_FULL' ? 409 : 400;
      return reply.code(status).send({ error: player.message, code: player.code });
    }

    const token = tokens.issue({ roomId: entry.room.id, playerId: player.id });
    void sockets.persistRoom(entry.room.id);
    bindBaleSeat(bale, body.initData, player.id, entry.room.id, entry.room.code, entry.room.options.name);
    const res: JoinRoomResponse = {
      roomId: entry.room.id,
      code: entry.room.code,
      token,
      playerId: player.id,
    };
    return reply.send(res);
  });
}

function bindBaleSeat(
  bale: BaleRuntime | undefined,
  initData: string | undefined,
  playerId: string,
  roomId: string,
  code: string,
  roomName: string,
): void {
  if (!bale || !initData) return;
  const user = validateBaleInitData(initData, bale.botToken);
  if (!user) return;
  bale.seats.occupy(user.id, { roomId, code, playerId, roomName });
}

function shareLink(req: FastifyRequest, code: string, publicUrl?: string): string {
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, '')}/join/${code}`;
  }
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'http';
  const host = req.headers.host ?? 'localhost:3001';
  return `${proto}://${host}/join/${code}`;
}
