import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import type { MessengerKind } from '@secret-hitler/shared';
import { connectDatabase, type Database, type DbConnection } from '../db/connection';
import {
  productBlastRecipients,
  productBlasts,
  productEvents,
  productLobbies,
  productMatches,
} from '../db/schema';
import {
  BLAST_RETURN_WINDOW_MS,
  type LobbyDeathReason,
  type LobbySource,
  type MatchOutcome,
  type ProductEvent,
  type ProductStore,
} from './ProductStore';

/** Postgres-backed {@link ProductStore}. */
export class DrizzleProductStore implements ProductStore {
  private readonly db: Database;
  private readonly close_: () => Promise<void>;

  constructor(connection: DbConnection) {
    this.db = connection.db;
    this.close_ = () => connection.pool.end();
  }

  static fromUrl(connectionString: string): DrizzleProductStore {
    return new DrizzleProductStore(connectDatabase(connectionString));
  }

  async recordEvent(event: ProductEvent): Promise<void> {
    await this.db.insert(productEvents).values({
      name: event.name,
      at: event.at,
      platform: event.platform ?? null,
      userKey: event.userKey ?? null,
      roomCode: event.roomCode ?? null,
      payload: event.payload ?? null,
    });
  }

  async openLobby(input: {
    roomCode: string;
    source: LobbySource;
    openedAt: Date;
    hourIran: number;
    seats: number;
  }): Promise<void> {
    const open = await this.openLobbyId(input.roomCode);
    if (open) {
      await this.touchLobby(input.roomCode, input.seats, input.openedAt);
      return;
    }
    await this.db.insert(productLobbies).values({
      roomCode: input.roomCode,
      source: input.source,
      openedAt: input.openedAt,
      hourIran: input.hourIran,
      peakSeats: input.seats,
      reached5At: input.seats >= 5 ? input.openedAt : null,
    });
  }

  async touchLobby(roomCode: string, seats: number, at: Date): Promise<void> {
    const open = await this.openLobbyId(roomCode);
    if (!open) return;
    await this.db
      .update(productLobbies)
      .set({
        peakSeats: sql`GREATEST(${productLobbies.peakSeats}, ${seats})`,
        reached5At: sql`CASE
          WHEN ${productLobbies.reached5At} IS NULL AND ${seats} >= 5 THEN ${at}
          ELSE ${productLobbies.reached5At}
        END`,
      })
      .where(eq(productLobbies.id, open));
  }

  async markLobbyDealt(roomCode: string, at: Date): Promise<void> {
    const open = await this.openLobbyId(roomCode);
    if (!open) return;
    await this.db
      .update(productLobbies)
      .set({ dealtAt: at })
      .where(and(eq(productLobbies.id, open), isNull(productLobbies.dealtAt)));
  }

  async closeLobby(roomCode: string, reason: LobbyDeathReason, at: Date): Promise<boolean> {
    const open = await this.openLobbyId(roomCode);
    if (!open) return false;
    await this.db
      .update(productLobbies)
      .set({ diedAt: at, deathReason: reason })
      .where(eq(productLobbies.id, open));
    return true;
  }

  async incrementLobbyAfkKicks(roomCode: string, count: number): Promise<void> {
    const [row] = await this.db
      .select({ id: productLobbies.id })
      .from(productLobbies)
      .where(and(eq(productLobbies.roomCode, roomCode), isNull(productLobbies.dealtAt)))
      .orderBy(desc(productLobbies.openedAt))
      .limit(1);
    if (!row) return;
    await this.db
      .update(productLobbies)
      .set({ afkKicks: sql`${productLobbies.afkKicks} + ${count}` })
      .where(eq(productLobbies.id, row.id));
  }

  async startMatch(roomCode: string, at: Date): Promise<void> {
    const live = await this.liveMatchId(roomCode);
    if (live) return;
    await this.db.insert(productMatches).values({ roomCode, startedAt: at });
  }

  async incrementMatchDisconnects(roomCode: string): Promise<void> {
    const live = await this.liveMatchId(roomCode);
    if (!live) return;
    await this.db
      .update(productMatches)
      .set({ disconnects: sql`${productMatches.disconnects} + 1` })
      .where(eq(productMatches.id, live));
  }

  async incrementMatchKickVotes(roomCode: string): Promise<void> {
    const live = await this.liveMatchId(roomCode);
    if (!live) return;
    await this.db
      .update(productMatches)
      .set({ kickVotes: sql`${productMatches.kickVotes} + 1` })
      .where(eq(productMatches.id, live));
  }

  async incrementMatchAfkKicks(roomCode: string, count: number): Promise<void> {
    const live = await this.liveMatchId(roomCode);
    if (!live) return;
    await this.db
      .update(productMatches)
      .set({ afkKicks: sql`${productMatches.afkKicks} + ${count}` })
      .where(eq(productMatches.id, live));
  }

  async finishMatch(roomCode: string, outcome: MatchOutcome, at: Date): Promise<void> {
    const live = await this.liveMatchId(roomCode);
    if (!live) return;
    await this.db
      .update(productMatches)
      .set({ endedAt: at, outcome })
      .where(eq(productMatches.id, live));
  }

  async abandonMatch(roomCode: string, at: Date): Promise<boolean> {
    const live = await this.liveMatchId(roomCode);
    if (!live) return false;
    await this.db
      .update(productMatches)
      .set({ endedAt: at, outcome: 'abandoned' })
      .where(eq(productMatches.id, live));
    return true;
  }

  async recordBlast(platform: MessengerKind, chatIds: string[], sentAt: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [blast] = await tx
        .insert(productBlasts)
        .values({ platform, sentAt, reached: chatIds.length })
        .returning({ id: productBlasts.id });
      if (!blast || chatIds.length === 0) return;
      await tx.insert(productBlastRecipients).values(
        chatIds.map((chatId) => ({ blastId: blast.id, chatId })),
      );
    });
  }

  async markBlastOpened(platform: MessengerKind, chatId: string, at: Date): Promise<void> {
    const recipientId = await this.recentRecipientId(platform, chatId, at);
    if (!recipientId) return;
    await this.db
      .update(productBlastRecipients)
      .set({ openedAt: at })
      .where(
        and(eq(productBlastRecipients.id, recipientId), isNull(productBlastRecipients.openedAt)),
      );
  }

  async markBlastSat(platform: MessengerKind, chatId: string, at: Date): Promise<void> {
    const recipientId = await this.recentRecipientId(platform, chatId, at);
    if (!recipientId) return;
    await this.db
      .update(productBlastRecipients)
      .set({ satAt: at })
      .where(and(eq(productBlastRecipients.id, recipientId), isNull(productBlastRecipients.satAt)));
  }

  close(): Promise<void> {
    return this.close_();
  }

  private async openLobbyId(roomCode: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ id: productLobbies.id })
      .from(productLobbies)
      .where(
        and(
          eq(productLobbies.roomCode, roomCode),
          isNull(productLobbies.diedAt),
          isNull(productLobbies.dealtAt),
        ),
      )
      .orderBy(desc(productLobbies.openedAt))
      .limit(1);
    return row?.id;
  }

  private async liveMatchId(roomCode: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ id: productMatches.id })
      .from(productMatches)
      .where(and(eq(productMatches.roomCode, roomCode), isNull(productMatches.endedAt)))
      .orderBy(desc(productMatches.startedAt))
      .limit(1);
    return row?.id;
  }

  private async recentRecipientId(
    platform: MessengerKind,
    chatId: string,
    at: Date,
  ): Promise<string | undefined> {
    const cutoff = new Date(at.getTime() - BLAST_RETURN_WINDOW_MS);
    const [row] = await this.db
      .select({ id: productBlastRecipients.id })
      .from(productBlastRecipients)
      .innerJoin(productBlasts, eq(productBlastRecipients.blastId, productBlasts.id))
      .where(
        and(
          eq(productBlasts.platform, platform),
          eq(productBlastRecipients.chatId, chatId),
          gt(productBlasts.sentAt, cutoff),
        ),
      )
      .orderBy(desc(productBlasts.sentAt))
      .limit(1);
    return row?.id;
  }
}
