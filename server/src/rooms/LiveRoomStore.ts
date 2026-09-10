import type { RoomSnapshot } from '@secret-hitler/shared';

export interface LiveTokenSnapshot {
  token: string;
  playerId: string;
}

/** Room plus the join tokens that still belong to its seats. */
export interface LiveRoomSnapshot {
  room: RoomSnapshot;
  tokens: LiveTokenSnapshot[];
}

/**
 * Durable copy of in-progress tables. Production uses Postgres; tests use
 * {@link InMemoryLiveRoomStore}. Optional — omitting it keeps rooms in RAM.
 */
export interface LiveRoomStore {
  save(id: string, code: string, snapshot: LiveRoomSnapshot): Promise<void>;
  remove(id: string): Promise<void>;
  loadAll(): Promise<LiveRoomSnapshot[]>;
}
