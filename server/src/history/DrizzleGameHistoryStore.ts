import { desc, eq, inArray, sql } from 'drizzle-orm';
import type { Faction, Role } from '@secret-hitler/shared';
import { connectDatabase, type Database, type DbConnection } from '../db/connection';
import { gamePlayers, games } from '../db/schema';
import type { GameHistoryStore, GameRecord, SavedGame } from './GameHistoryStore';

/** Postgres-backed {@link GameHistoryStore} using Drizzle over a pooled pg connection. */
export class DrizzleGameHistoryStore implements GameHistoryStore {
  private readonly db: Database;
  private readonly close_: () => Promise<void>;

  constructor(connection: DbConnection) {
    this.db = connection.db;
    this.close_ = () => connection.pool.end();
  }

  /** Build a store from a connection string (one pool for the process). */
  static fromUrl(connectionString: string): DrizzleGameHistoryStore {
    return new DrizzleGameHistoryStore(connectDatabase(connectionString));
  }

  async saveGame(record: GameRecord): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [game] = await tx
        .insert(games)
        .values({
          roomCode: record.roomCode,
          roomName: record.roomName,
          winner: record.winner,
          playerCount: record.playerCount,
          liberalPolicies: record.liberalPolicies,
          fascistPolicies: record.fascistPolicies,
        })
        .returning({ id: games.id });

      if (record.players.length > 0) {
        await tx.insert(gamePlayers).values(
          record.players.map((player) => ({
            gameId: game.id,
            name: player.name,
            role: player.role,
            seat: player.seat,
            won: player.won,
            joinKey: player.joinKey,
          })),
        );
      }
    });
  }

  async listRecent(limit = 20): Promise<SavedGame[]> {
    const rows = await this.db
      .select()
      .from(games)
      .orderBy(desc(games.endedAt))
      .limit(limit);

    return Promise.all(
      rows.map(async (game): Promise<SavedGame> => {
        const seats = await this.db
          .select()
          .from(gamePlayers)
          .where(eq(gamePlayers.gameId, game.id))
          .orderBy(gamePlayers.seat);
        return {
          id: game.id,
          roomCode: game.roomCode,
          roomName: game.roomName,
          winner: game.winner as Faction,
          playerCount: game.playerCount,
          liberalPolicies: game.liberalPolicies,
          fascistPolicies: game.fascistPolicies,
          endedAt: game.endedAt.toISOString(),
          players: seats.map((seat) => ({
            name: seat.name,
            role: seat.role as Role,
            seat: seat.seat,
            won: seat.won,
            joinKey: seat.joinKey ?? null,
          })),
        };
      }),
    );
  }

  async satTogether(leftKey: string, rightKey: string): Promise<boolean> {
    if (!leftKey || !rightKey || leftKey === rightKey) return false;
    const rows = await this.db
      .select({ gameId: gamePlayers.gameId })
      .from(gamePlayers)
      .where(inArray(gamePlayers.joinKey, [leftKey, rightKey]))
      .groupBy(gamePlayers.gameId)
      .having(sql`count(distinct ${gamePlayers.joinKey}) = 2`)
      .limit(1);
    return rows.length > 0;
  }

  close(): Promise<void> {
    return this.close_();
  }
}
