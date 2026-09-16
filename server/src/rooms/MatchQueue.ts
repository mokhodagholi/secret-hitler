import { makeId, PUBLIC_TABLE_MAX_PLAYERS } from '@secret-hitler/shared';
import type { WebSocket } from 'ws';

export interface MatchQueueEntry {
  id: string;
  token: string;
  name: string;
  avatar?: number;
  joinKey: string | null;
}

export interface SeatedQueueEntry extends MatchQueueEntry {
  ws: WebSocket;
}

/**
 * FIFO of people who tapped Find Match and are not yet in a reserved room.
 * The live socket is bound on auth so we only form a match from connected waiters.
 */
export class MatchQueue {
  private readonly entries: MatchQueueEntry[] = [];
  private readonly byToken = new Map<string, MatchQueueEntry>();
  private readonly byJoinKey = new Map<string, MatchQueueEntry>();
  private readonly sockets = new Map<string, WebSocket>();

  get size(): number {
    return this.entries.length;
  }

  get max(): number {
    return PUBLIC_TABLE_MAX_PLAYERS;
  }

  status(): { waiting: number; max: number } {
    return { waiting: this.entries.length, max: this.max };
  }

  lookup(token: string): MatchQueueEntry | undefined {
    return this.byToken.get(token);
  }

  lookupByJoinKey(joinKey: string): MatchQueueEntry | undefined {
    return this.byJoinKey.get(joinKey);
  }

  socketFor(playerId: string): WebSocket | undefined {
    return this.sockets.get(playerId);
  }

  connectedCount(): number {
    return this.entries.filter((entry) => this.sockets.has(entry.id)).length;
  }

  enqueue(args: {
    name: string;
    avatar?: number;
    joinKey: string | null;
  }): MatchQueueEntry {
    if (args.joinKey) {
      const existing = this.byJoinKey.get(args.joinKey);
      if (existing) return existing;
    }
    const entry: MatchQueueEntry = {
      id: makeId(),
      token: makeId(),
      name: args.name.trim(),
      avatar: args.avatar,
      joinKey: args.joinKey,
    };
    this.entries.push(entry);
    this.byToken.set(entry.token, entry);
    if (entry.joinKey) this.byJoinKey.set(entry.joinKey, entry);
    return entry;
  }

  bindSocket(playerId: string, ws: WebSocket): void {
    this.sockets.set(playerId, ws);
  }

  remove(playerId: string): MatchQueueEntry | undefined {
    const index = this.entries.findIndex((entry) => entry.id === playerId);
    if (index < 0) return undefined;
    const [entry] = this.entries.splice(index, 1);
    this.byToken.delete(entry.token);
    if (entry.joinKey) this.byJoinKey.delete(entry.joinKey);
    this.sockets.delete(playerId);
    return entry;
  }

  /** Pull the oldest connected waiters off the queue, keeping their sockets. */
  takeConnected(count: number): SeatedQueueEntry[] {
    const taken: SeatedQueueEntry[] = [];
    for (const entry of [...this.entries]) {
      if (taken.length >= count) break;
      const ws = this.sockets.get(entry.id);
      if (!ws) continue;
      this.remove(entry.id);
      taken.push({ ...entry, ws });
    }
    return taken;
  }

  forEachSocket(send: (ws: WebSocket) => void): void {
    for (const ws of this.sockets.values()) send(ws);
  }
}
