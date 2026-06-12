import type { Faction, Role } from '@secret-hitler/shared';

/** A single seat's outcome in a finished game. */
export interface GamePlayerRecord {
  name: string;
  role: Role;
  seat: number;
  won: boolean;
}

/** A finished game ready to persist. */
export interface GameRecord {
  roomCode: string;
  roomName: string;
  winner: Faction;
  playerCount: number;
  liberalPolicies: number;
  fascistPolicies: number;
  players: GamePlayerRecord[];
}

/** A persisted game read back for the history endpoint. */
export interface SavedGame extends GameRecord {
  id: string;
  endedAt: string;
}

/**
 * Persistence boundary for finished games. The server depends only on this
 * interface, so the Postgres-backed implementation can be swapped for the
 * in-memory one (tests) without touching the game flow. A store is always
 * present — production requires Postgres via `DATABASE_URL`.
 */
export interface GameHistoryStore {
  saveGame(record: GameRecord): Promise<void>;
  listRecent(limit?: number): Promise<SavedGame[]>;
  close(): Promise<void>;
}
