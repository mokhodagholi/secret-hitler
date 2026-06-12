import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import Fastify from 'fastify';
import { WebSocketServer } from 'ws';
import { SHARED_VERSION } from '@secret-hitler/shared';
import { RoomRepository } from './RoomRepository';
import { TokenStore } from './TokenStore';
import { SocketHandler } from './SocketHandler';
import { registerRoutes } from './routes';

const PORT = Number(process.env.PORT ?? 3001);
const WS_PATH = '/ws';

async function main() {
  const app = Fastify({ logger: true });

  // --- Composition root: wire the singletons together. -------------------
  // MIN_PLAYERS env lowers the start minimum for dev; unset = standard rules.
  const minPlayers = Number(process.env.MIN_PLAYERS) || undefined;
  const repo = new RoomRepository(minPlayers);
  const tokens = new TokenStore();
  const sockets = new SocketHandler(repo, tokens);

  app.get('/health', async () => ({ status: 'ok', shared: SHARED_VERSION }));
  registerRoutes(app, { repo, tokens, sockets });

  await app.ready();

  // --- Attach a raw ws server to Fastify's underlying HTTP server. -------
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

  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`WebSocket endpoint ready at ws://localhost:${PORT}${WS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
