import type { WebSocket } from 'ws';
import type { ServerMessage } from '@secret-hitler/shared';

/**
 * Maps `playerId → live socket`. Keeps raw `ws` references out of the shared
 * domain model — the engine speaks in player ids, this layer turns those into
 * actual sends. One registry instance per server.
 */
export class ConnectionRegistry {
  private readonly byPlayer = new Map<string, WebSocket>();
  private readonly bySocket = new Map<WebSocket, string>();

  bind(playerId: string, ws: WebSocket): void {
    // Drop any stale socket for the same player (reconnect / second tab).
    const existing = this.byPlayer.get(playerId);
    if (existing && existing !== ws) {
      this.bySocket.delete(existing);
      existing.close(4001, 'Replaced by new connection');
    }
    this.byPlayer.set(playerId, ws);
    this.bySocket.set(ws, playerId);
  }

  playerFor(ws: WebSocket): string | undefined {
    return this.bySocket.get(ws);
  }

  unbind(ws: WebSocket): string | undefined {
    const playerId = this.bySocket.get(ws);
    this.bySocket.delete(ws);
    if (playerId && this.byPlayer.get(playerId) === ws) {
      this.byPlayer.delete(playerId);
    }
    return playerId;
  }

  isConnected(playerId: string): boolean {
    return this.byPlayer.has(playerId);
  }

  send(playerId: string, message: ServerMessage): void {
    const ws = this.byPlayer.get(playerId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Deliver one last frame, then close. The close waits until the payload
   * is flushed so the client can show why they were removed.
   */
  sendAndClose(playerId: string, message: ServerMessage): void {
    const ws = this.byPlayer.get(playerId);
    if (!ws) return;
    this.byPlayer.delete(playerId);
    this.bySocket.delete(ws);
    const payload = JSON.stringify(message);
    if (ws.readyState === ws.OPEN) {
      ws.send(payload, () => ws.close());
    } else {
      ws.close();
    }
  }

  /** Unbind and close a player's socket (e.g. their room was destroyed). */
  close(playerId: string): void {
    const ws = this.byPlayer.get(playerId);
    if (!ws) return;
    this.byPlayer.delete(playerId);
    this.bySocket.delete(ws);
    ws.close();
  }
}
