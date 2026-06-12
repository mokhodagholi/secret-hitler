import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import Fastify, { type FastifyInstance } from 'fastify';
import { WebSocketServer } from 'ws';
import { SHARED_VERSION } from '@secret-hitler/shared';
import { RoomRepository } from './rooms/RoomRepository';
import { TokenStore } from './rooms/TokenStore';
import { SocketHandler } from './ws/SocketHandler';
import { registerRoutes } from './http/routes';

const WS_PATH = '/ws';

export interface ServerOptions {
  /** Server-wide start minimum (env override in dev). */
  minPlayers?: number;
  logger?: boolean;
}

export interface BuiltServer {
  app: FastifyInstance;
  repo: RoomRepository;
  tokens: TokenStore;
  sockets: SocketHandler;
}

/**
 * Composition root: wires the singletons together and attaches the raw `ws`
 * server to Fastify's HTTP server. Kept separate from the listen() bootstrap
 * so tests can build a fully wired server on an ephemeral port.
 */
export async function buildServer(options: ServerOptions = {}): Promise<BuiltServer> {
  const app = Fastify({ logger: options.logger ?? false });

  const repo = new RoomRepository(options.minPlayers);
  const tokens = new TokenStore();
  const sockets = new SocketHandler(repo, tokens);

  app.get('/health', async () => ({ status: 'ok', shared: SHARED_VERSION }));
  registerRoutes(app, { repo, tokens, sockets });

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

  return { app, repo, tokens, sockets };
}
