import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import Fastify, { type FastifyInstance } from 'fastify';
import { WebSocketServer } from 'ws';
import { SHARED_VERSION } from '@secret-hitler/shared';
import { RoomRepository } from './rooms/RoomRepository';
import { TokenStore } from './rooms/TokenStore';
import { SocketHandler } from './ws/SocketHandler';
import { registerRoutes } from './http/routes';
import { GameResultRecorder } from './history/GameResultRecorder';
import type { GameHistoryStore } from './history/GameHistoryStore';
import { InMemoryGameHistoryStore } from './history/InMemoryGameHistoryStore';
import { BaleSeatIndex } from './bale/BaleSeatIndex';
import type { BaleRuntime } from './bale/webhook';

const WS_PATH = '/ws';

export interface ServerOptions {
  /** Server-wide start minimum (env override in dev). */
  minPlayers?: number;
  logger?: boolean;
  /**
   * Store for finished games. The production entrypoint always supplies a
   * Postgres-backed one (DATABASE_URL is required there); tests and embeddings
   * default to an in-memory store. The server never runs without a store.
   */
  history?: GameHistoryStore;
  /** Public HTTPS origin for share links and the Bale mini-app. */
  publicUrl?: string;
  /** Present when BALE_BOT_TOKEN is configured. */
  bale?: BaleRuntime;
}

export interface BuiltServer {
  app: FastifyInstance;
  repo: RoomRepository;
  tokens: TokenStore;
  sockets: SocketHandler;
  seats: BaleSeatIndex;
}

/**
 * Composition root: wires the singletons together and attaches the raw `ws`
 * server to Fastify's HTTP server. Kept separate from the listen() bootstrap
 * so tests can build a fully wired server on an ephemeral port.
 */
export async function buildServer(options: ServerOptions = {}): Promise<BuiltServer> {
  const app = Fastify({ logger: options.logger ?? false, trustProxy: true });

  const seats = options.bale?.seats ?? new BaleSeatIndex();
  const bale = options.bale ? { ...options.bale, seats } : undefined;

  const repo = new RoomRepository(options.minPlayers);
  const tokens = new TokenStore();
  const sockets = new SocketHandler(repo, tokens, seats);
  const history = options.history ?? new InMemoryGameHistoryStore();
  const recorder = new GameResultRecorder(history);

  app.get('/health', async () => ({ status: 'ok', shared: SHARED_VERSION }));
  registerRoutes(app, {
    repo,
    tokens,
    sockets,
    recorder,
    history,
    publicUrl: options.publicUrl,
    bale,
  });

  await app.ready();

  const wss = new WebSocketServer({ noServer: true });
  wss.on('connection', (ws) => sockets.handleConnection(ws));

  app.server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = new URL(req.url ?? '', 'http://localhost');
    if (pathname !== WS_PATH) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  return { app, repo, tokens, sockets, seats };
}
