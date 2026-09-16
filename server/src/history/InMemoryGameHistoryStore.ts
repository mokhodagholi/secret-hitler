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

  async satTogether(leftKey: string, rightKey: string): Promise<boolean> {
    if (!leftKey || !rightKey || leftKey === rightKey) return false;
    return this.games.some((game) => {
      const keys = new Set(
        game.players.map((player) => player.joinKey).filter((key): key is string => Boolean(key)),
      );
      return keys.has(leftKey) && keys.has(rightKey);
    });
  }

  async close(): Promise<void> {}
}
