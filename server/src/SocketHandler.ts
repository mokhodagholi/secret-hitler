import type { WebSocket } from 'ws';
import type {
  ClientMessage,
  ServerErrorCode,
  ServerMessage,
} from '@secret-hitler/shared';
import { ConnectionRegistry } from './ConnectionRegistry';
import type { RoomEntry, RoomRepository } from './RoomRepository';
import type { TokenStore } from './TokenStore';

/**
 * Bridges raw WebSocket traffic and the game engine. Deserializes inbound
 * {@link ClientMessage}s into engine calls, and subscribes to each engine's
 * events to broadcast per-viewer state snapshots back out.
 */
export class SocketHandler {
  private readonly connections = new ConnectionRegistry();
  /** Which room a given live socket has authenticated into. */
  private readonly socketRoom = new WeakMap<WebSocket, string>();

  constructor(
    private readonly repo: RoomRepository,
    private readonly tokens: TokenStore,
  ) {}

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
      if (room.isEmpty) this.repo.remove(room.id);
    });

    engine.on('roleAssigned', ({ playerId }) => {
      const role = room.findPlayer(playerId)?.role;
      if (role) this.connections.send(playerId, { type: 'private', role });
    });

    engine.on('chat', ({ message }) => this.broadcast(room.id, { type: 'chat', message }));
    engine.on('log', ({ entry: e }) => this.broadcast(room.id, { type: 'log', entry: e }));
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

    const roomId = this.socketRoom.get(ws);
    const playerId = this.connections.playerFor(ws);
    if (!roomId || !playerId) {
      this.sendError(ws, 'AUTH_FAILED', 'Authenticate before sending messages.');
      return;
    }
    const entry = this.repo.get(roomId);
    if (!entry) return;
    const { engine } = entry;

    switch (msg.type) {
      case 'player:ready':
        engine.setReady(playerId, true);
        break;
      case 'player:unready':
        engine.setReady(playerId, false);
        break;
      case 'game:start': {
        const error = engine.startGame(playerId);
        if (error) this.sendError(ws, error.code, error.message);
        break;
      }
      case 'chat:message':
        engine.postChat(playerId, msg.text);
        break;
      case 'command': {
        const error = engine.handleCommand(playerId, msg.command);
        if (error) this.sendError(ws, error.code, error.message);
        break;
      }
      case 'ping':
        this.sendTo(ws, { type: 'pong' });
        break;
    }
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
