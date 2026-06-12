import type { FastifyInstance, FastifyRequest } from 'fastify';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
} from '@secret-hitler/shared';
import { RateLimiter } from '../util/RateLimiter';
import type { RoomRepository } from '../rooms/RoomRepository';
import type { SocketHandler } from '../ws/SocketHandler';
import type { TokenStore } from '../rooms/TokenStore';
import type { GameResultRecorder } from '../history/GameResultRecorder';
import type { GameHistoryStore } from '../history/GameHistoryStore';
import { hashPassword, verifyPassword } from './password';

export interface RouteDeps {
  repo: RoomRepository;
  tokens: TokenStore;
  sockets: SocketHandler;
  /** Persists finished games, when a database is configured. */
  recorder?: GameResultRecorder;
  /** Reads finished games for the history endpoint, when configured. */
  history?: GameHistoryStore;
}

/** Per-IP budgets: room creation is expensive, join attempts guard passwords. */
const CREATE_LIMIT = 5;
const JOIN_LIMIT = 10;
const LIMIT_WINDOW_MS = 60_000;

/** Registers room HTTP endpoints under `/api`. */
export function registerRoutes(app: FastifyInstance, deps: RouteDeps): void {
  const { repo, tokens, sockets, recorder, history } = deps;
  const createLimiter = new RateLimiter(CREATE_LIMIT, LIMIT_WINDOW_MS);
  const joinLimiter = new RateLimiter(JOIN_LIMIT, LIMIT_WINDOW_MS);

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
      showRoles: body.options?.showRoles,
      timerEnabled: body.options?.timerEnabled,
      confirmActions: body.options?.confirmActions,
    });
    sockets.registerEngine(entry);
    recorder?.attach(entry);

    const host = entry.engine.addPlayer(body.hostName, true);
    if ('code' in host) {
      return reply.code(400).send({ error: host.message });
    }

    const token = tokens.issue({ roomId: entry.room.id, playerId: host.id });
    const res: CreateRoomResponse = {
      roomId: entry.room.id,
      code: entry.room.code,
      shareLink: shareLink(req, entry.room.code),
      token,
      playerId: host.id,
    };
    return reply.code(201).send(res);
  });

  // List public, joinable rooms.
  app.get('/api/rooms', async () => repo.listPublic());

  // Recent finished games. 404-free: returns an empty list when no DB is set.
  app.get('/api/history', async (req) => {
    if (!history) return [];
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

    const player = entry.engine.addPlayer(body.name);
    if ('code' in player) {
      const status = player.code === 'ROOM_FULL' ? 409 : 400;
      return reply.code(status).send({ error: player.message, code: player.code });
    }

    const token = tokens.issue({ roomId: entry.room.id, playerId: player.id });
    const res: JoinRoomResponse = {
      roomId: entry.room.id,
      code: entry.room.code,
      token,
      playerId: player.id,
    };
    return reply.send(res);
  });
}

function shareLink(req: FastifyRequest, code: string): string {
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'http';
  const host = req.headers.host ?? 'localhost:3001';
  return `${proto}://${host}/join/${code}`;
}
