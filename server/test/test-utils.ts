import WebSocket from 'ws';
import type { ClientMessage, ServerMessage } from '@secret-hitler/shared';
import type { FastifyInstance } from 'fastify';
import { buildServer, type BuiltServer, type ServerOptions } from '../src/app';

export interface LiveServer extends BuiltServer {
  port: number;
  close(): Promise<void>;
}

/** Build the full server (HTTP + WS) on an ephemeral port. */
export async function listenServer(
  minPlayers = 3,
  options: Omit<ServerOptions, 'minPlayers'> = {},
): Promise<LiveServer> {
  const built = await buildServer({ minPlayers, ...options });
  await built.app.listen({ port: 0, host: '127.0.0.1' });
  const address = built.app.server.address();
  if (address == null || typeof address === 'string') {
    throw new Error('expected a bound TCP address');
  }
  return {
    ...built,
    port: address.port,
    close: () => built.app.close(),
  };
}

export async function httpJson<T>(
  app: FastifyInstance,
  method: 'POST' | 'GET' | 'PUT',
  url: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const response = await app.inject({ method, url, payload: body as object });
  return { status: response.statusCode, body: response.json() as T };
}

/**
 * A WebSocket test client with a consumable inbox: `waitFor` resolves with the
 * first (still unconsumed) message matching the predicate, so assertions never
 * depend on exact message ordering — the usual source of flaky socket tests.
 */
export class TestClient {
  private readonly inbox: ServerMessage[] = [];
  private waiters: Array<{
    predicate: (message: ServerMessage) => boolean;
    resolve: (message: ServerMessage) => void;
  }> = [];

  private constructor(private readonly socket: WebSocket) {
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString()) as ServerMessage;
      const waiting = this.waiters.find((w) => w.predicate(message));
      if (waiting) {
        this.waiters = this.waiters.filter((w) => w !== waiting);
        waiting.resolve(message);
      } else {
        this.inbox.push(message);
      }
    });
  }

  static connect(port: number): Promise<TestClient> {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    return new Promise((resolve, reject) => {
      socket.once('open', () => resolve(new TestClient(socket)));
      socket.once('error', reject);
    });
  }

  send(message: ClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  /** Send a raw (possibly malformed) frame, bypassing the typed contract. */
  sendRaw(frame: string): void {
    this.socket.send(frame);
  }

  waitFor<Type extends ServerMessage['type']>(
    type: Type,
    predicate: (message: Extract<ServerMessage, { type: Type }>) => boolean = () => true,
    timeoutMs = 3000,
  ): Promise<Extract<ServerMessage, { type: Type }>> {
    type Wanted = Extract<ServerMessage, { type: Type }>;
    const matches = (message: ServerMessage): boolean =>
      message.type === type && predicate(message as Wanted);

    const backlogIndex = this.inbox.findIndex(matches);
    if (backlogIndex !== -1) {
      const [message] = this.inbox.splice(backlogIndex, 1);
      return Promise.resolve(message as Wanted);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w.resolve !== wrappedResolve);
        reject(new Error(`Timed out waiting for "${type}"`));
      }, timeoutMs);
      const wrappedResolve = (message: ServerMessage) => {
        clearTimeout(timer);
        resolve(message as Wanted);
      };
      this.waiters.push({ predicate: matches, resolve: wrappedResolve });
    });
  }

  /** Auth handshake: send the token, resolve once the server confirms. */
  async auth(token: string): Promise<string> {
    this.send({ type: 'auth', token });
    const authed = await this.waitFor('authed');
    return authed.playerId;
  }

  close(): void {
    this.socket.close();
  }
}
