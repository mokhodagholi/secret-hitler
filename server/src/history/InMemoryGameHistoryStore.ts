import type { GameHistoryStore, GameRecord, SavedGame } from './GameHistoryStore';

/**
 * Non-persistent {@link GameHistoryStore} backed by an array. Used by tests and
 * any embedding that wires a store without Postgres — the server internals
 * always hold a store, never a null. Newest games first.
 */
export class InMemoryGameHistoryStore implements GameHistoryStore {
  private readonly games: SavedGame[] = [];
  private sequence = 0;

  async saveGame(record: GameRecord): Promise<void> {
    this.games.unshift({
      ...record,
      id: String(++this.sequence),
      endedAt: new Date().toISOString(),
    });
  }

  async listRecent(limit = 20): Promise<SavedGame[]> {
    return this.games.slice(0, limit);
  }

  async close(): Promise<void> {}
}
