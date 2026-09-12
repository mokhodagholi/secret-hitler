import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import Fastify, { type FastifyInstance } from 'fastify';
import { WebSocketServer } from 'ws';
import {
  DEFAULT_FLAGS,
  SHARED_VERSION,
  type FeatureFlags,
} from '@secret-hitler/shared';
import { RoomRepository } from './rooms/RoomRepository';
import { TokenStore } from './rooms/TokenStore';
import { SocketHandler } from './ws/SocketHandler';
import { registerRoutes } from './http/routes';
import { GameResultRecorder } from './history/GameResultRecorder';
import type { GameHistoryStore } from './history/GameHistoryStore';
import { InMemoryGameHistoryStore } from './history/InMemoryGameHistoryStore';
import type { ProfileStore } from './profiles/ProfileStore';
import { InMemoryProfileStore } from './profiles/InMemoryProfileStore';
import { BaleSeatIndex } from './bale/BaleSeatIndex';
import type { BaleRuntime } from './bale/webhook';
import type { LiveRoomStore } from './rooms/LiveRoomStore';
import { restoreLiveRooms } from './rooms/restoreLiveRooms';
import type { VoiceHub } from './voice/VoiceHub';

const WS_PATH = '/ws';

export interface ServerOptions {
  /**
   * Start minimum for tests only. Production omits this and uses standard
   * Secret Hitler rules (5).
   */
  minPlayers?: number;
  logger?: boolean;
  /**
   * Store for finished games. The production entrypoint always supplies a
   * Postgres-backed one (DATABASE_URL is required there); tests and embeddings
   * default to an in-memory store. The server never runs without a store.
   */
  history?: GameHistoryStore;
  /** Chosen player cards. Tests default to in-memory. */
  profiles?: ProfileStore;
  /**
   * Durable live rooms. Production always supplies Postgres; tests omit this
   * unless they are asserting restart survival.
   */
  live?: LiveRoomStore;
  /** Public HTTPS origin for share links and the Bale mini-app. */
  publicUrl?: string;
  /** Present when BALE_BOT_TOKEN is configured. */
  bale?: BaleRuntime;
  /** Present when TELEGRAM_BOT_TOKEN is configured. */
  telegram?: BaleRuntime;
  /**
   * Server-owned feature flags. Production passes parseFeatureFlags(process.env).
   * Tests inject so suites do not depend on the ambient environment.
   */
  flags?: FeatureFlags;
  /** Present when FEATURE_VOICE is on. Tests inject a memory hub. */
  voice?: VoiceHub | null;
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

  const seats = options.bale?.seats ?? options.telegram?.seats ?? new BaleSeatIndex();
  const bale = options.bale ? { ...options.bale, kind: options.bale.kind ?? 'bale', seats } : undefined;
  const telegram = options.telegram
    ? { ...options.telegram, kind: 'telegram' as const, seats }
    : undefined;

  const repo = new RoomRepository(options.minPlayers);
  const tokens = new TokenStore();
  const flags = options.flags ?? DEFAULT_FLAGS;
  const sockets = new SocketHandler(
    repo,
    tokens,
    seats,
    options.live ?? null,
    bale ?? null,
    flags,
    options.voice ?? null,
    telegram ?? null,
  );
  const history = options.history ?? new InMemoryGameHistoryStore();
  const profiles = options.profiles ?? new InMemoryProfileStore();
  const recorder = new GameResultRecorder(history);
  sockets.onRoomCreated = (entry) => recorder.attach(entry);

  if (options.live) {
    const restored = await restoreLiveRooms({
      repo,
      tokens,
      sockets,
      recorder,
      live: options.live,
    });
    if (restored > 0) {
      app.log.info({ restored }, 'Restored live rooms.');
    }
  }

  sockets.ensurePublicLobby();

  app.addHook('onClose', async () => {
    sockets.dispose();
  });

  app.get('/health', async () => ({ status: 'ok', shared: SHARED_VERSION }));
  registerRoutes(app, {
    repo,
    tokens,
    sockets,
    recorder,
    history,
    profiles,
    publicUrl: options.publicUrl,
    bale,
    telegram,
    flags,
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
