import type { WebSocket } from 'ws';
import {
  MessageRouter,
  SPEAKING_TURN_MS,
  type ClientMessage,
  type EngineError,
  type GameEngine,
  type ServerErrorCode,
  type ServerMessage,
} from '@secret-hitler/shared';
import { ConnectionRegistry } from './ConnectionRegistry';
import type { RoomEntry, RoomRepository } from './RoomRepository';
import type { TokenStore } from './TokenStore';

/** Resolved per-message context for an authenticated socket. */
interface GameContext {
  ws: WebSocket;
  entry: RoomEntry;
  engine: GameEngine;
  playerId: string;
}

/**
 * Bridges raw WebSocket traffic and the game engine. Deserializes inbound
 * {@link ClientMessage}s into engine calls, and subscribes to each engine's
 * events to broadcast per-viewer state snapshots back out.
 */
export class SocketHandler {
  private readonly connections = new ConnectionRegistry();
  /** Which room a given live socket has authenticated into. */
  private readonly socketRoom = new WeakMap<WebSocket, string>();
  /** Per-room talking-stick rotation timers. */
  private readonly turnTimers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly router: MessageRouter<ClientMessage, GameContext>;

  constructor(
    private readonly repo: RoomRepository,
    private readonly tokens: TokenStore,
  ) {
    this.router = this.buildRouter();
  }

  /** Authenticated client messages — `auth` is handled before dispatch. */
  private buildRouter(): MessageRouter<ClientMessage, GameContext> {
    return new MessageRouter<ClientMessage, GameContext>()
      .on('player:ready', (_m, ctx) => ctx.engine.setReady(ctx.playerId, true))
      .on('player:unready', (_m, ctx) => ctx.engine.setReady(ctx.playerId, false))
      .on('game:start', (_m, ctx) => this.fail(ctx, ctx.engine.startGame(ctx.playerId)))
      .on('chat:message', (m, ctx) => ctx.engine.postChat(ctx.playerId, m.text))
      .on('command', (m, ctx) =>
        this.fail(ctx, ctx.engine.handleCommand(ctx.playerId, m.command)),
      )
      .on('room:leave', (_m, ctx) => this.leaveRoom(ctx))
      .on('ping', (_m, ctx) => this.sendTo(ctx.ws, { type: 'pong' }));
  }

  /** Wire an engine's events to the connection layer. Call once per room. */
  registerEngine(entry: RoomEntry): void {
    const { engine, room } = entry;

    engine.on('stateChanged', () => {
      for (const player of room.players) {
        if (this.connections.isConnected(player.id)) {
          this.connections.send(player.id, {
            type: 'state',
            state: room.viewFor(player.id),
          });
        }
      }
      if (room.isEmpty) {
        this.stopTurnTimer(room.id);
        this.repo.remove(room.id);
      }
    });

    engine.on('roleAssigned', ({ playerId }) => {
      const role = room.findPlayer(playerId)?.role;
      if (role) this.connections.send(playerId, { type: 'private', role });
    });

    engine.on('chat', ({ message }) => this.broadcast(room.id, { type: 'chat', message }));
    engine.on('log', ({ entry: e }) => this.broadcast(room.id, { type: 'log', entry: e }));
    // Each speaker holds the stick for one window; reschedule on every change.
    engine.on('speakerChanged', ({ speakerId }) => {
      this.stopTurnTimer(room.id);
      if (!speakerId) return;
      const timer = setTimeout(() => {
        this.repo.get(room.id)?.engine.advanceSpeaker();
      }, SPEAKING_TURN_MS);
      this.turnTimers.set(room.id, timer);
    });
  }

  private stopTurnTimer(roomId: string): void {
    const timer = this.turnTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.turnTimers.delete(roomId);
    }
  }

  /** Attach handlers to a freshly upgraded socket. */
  handleConnection(ws: WebSocket): void {
    ws.on('message', (data) => this.onMessage(ws, data.toString()));
    ws.on('close', () => this.onClose(ws));
    ws.on('error', () => ws.close());
  }

  private onMessage(ws: WebSocket, raw: string): void {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }

    if (msg.type === 'auth') {
      this.onAuth(ws, msg.token);
      return;
    }

    const context = this.contextFor(ws);
    if (!context) {
      this.sendError(ws, 'AUTH_FAILED', 'Authenticate before sending messages.');
      return;
    }
    this.router.dispatch(msg, context);
  }

  private contextFor(ws: WebSocket): GameContext | null {
    const roomId = this.socketRoom.get(ws);
    const playerId = this.connections.playerFor(ws);
    if (!roomId || !playerId) return null;
    const entry = this.repo.get(roomId);
    if (!entry) return null;
    return { ws, entry, engine: entry.engine, playerId };
  }

  private fail(context: GameContext, error: EngineError | null): void {
    if (error) this.sendError(context.ws, error.code, error.message);
  }

  /** Host leave destroys the room; a guest just vacates their seat. */
  private leaveRoom(context: GameContext): void {
    const { entry, engine, playerId } = context;
    if (entry.room.findPlayer(playerId)?.isHost) {
      this.broadcast(entry.room.id, { type: 'room:closed', reason: 'HOST_LEFT' });
      this.destroyRoom(entry);
    } else {
      engine.removePlayer(playerId);
      this.connections.close(playerId);
    }
  }

  /** Kick every remaining connection and drop the room from the repository. */
  private destroyRoom(entry: RoomEntry): void {
    this.stopTurnTimer(entry.room.id);
    for (const player of entry.room.players) {
      this.connections.close(player.id);
    }
    this.repo.remove(entry.room.id);
  }

  private onAuth(ws: WebSocket, token: string): void {
    const claim = this.tokens.lookup(token);
    const entry = claim ? this.repo.get(claim.roomId) : undefined;
    const player = entry?.room.findPlayer(claim!.playerId);
    if (!claim || !entry || !player) {
      this.sendError(ws, 'AUTH_FAILED', 'Invalid or expired token.');
      ws.close(4001, 'auth failed');
      return;
    }

    this.connections.bind(player.id, ws);
    this.socketRoom.set(ws, entry.room.id);
    entry.engine.setConnected(player.id, true);

    this.sendTo(ws, { type: 'authed', playerId: player.id });
    this.sendTo(ws, { type: 'state', state: entry.room.viewFor(player.id) });
    if (player.role) this.sendTo(ws, { type: 'private', role: player.role });
  }

  private onClose(ws: WebSocket): void {
    const playerId = this.connections.unbind(ws);
    const roomId = this.socketRoom.get(ws);
    this.socketRoom.delete(ws);
    if (!playerId || !roomId) return;
    this.repo.get(roomId)?.engine.setConnected(playerId, false);
  }

  private broadcast(roomId: string, message: ServerMessage): void {
    const room = this.repo.get(roomId)?.room;
    if (!room) return;
    for (const player of room.players) {
      this.connections.send(player.id, message);
    }
  }

  private sendTo(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
  }

  private sendError(ws: WebSocket, code: ServerErrorCode, message: string): void {
    this.sendTo(ws, { type: 'error', code, message });
  }
}
