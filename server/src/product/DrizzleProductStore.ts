import { and, desc, eq, gt, gte, isNull, lt, or, sql } from 'drizzle-orm';
import type { MessengerKind } from '@secret-hitler/shared';
import { connectDatabase, type Database, type DbConnection } from '../db/connection';
import {
  friendRequests,
  productBlastRecipients,
  productBlasts,
  productEvents,
  productLobbies,
  productMatches,
  tableInvites,
} from '../db/schema';
import { LOBBY_FILL } from './lobbyFill';
import {
  BLAST_RETURN_WINDOW_MS,
  type DigestWindowTotals,
  type LobbyDeathReason,
  type LobbySource,
  type MatchOutcome,
  type ProductEvent,
  type ProductLobby,
  type ProductMatch,
  type ProductStore,
  type WarmInviteQuery,
} from './ProductStore';
import { PRODUCT_DIGEST } from './productDigest';
import { rankWarmInviteTargets } from './rankWarmInviteTargets';

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

  async listWarmInviteTargets(query: WarmInviteQuery): Promise<string[]> {
    const lookback = new Date(
      query.now.getTime() -
        Math.max(query.warmWindowMs, query.inviteCooldownMs, LOBBY_FILL.activityLookbackMs),
    );
    const rows = await this.db
      .select({
        name: productEvents.name,
        at: productEvents.at,
        platform: productEvents.platform,
        userKey: productEvents.userKey,
        roomCode: productEvents.roomCode,
        payload: productEvents.payload,
      })
      .from(productEvents)
      .where(
        and(
          eq(productEvents.platform, query.platform),
          gt(productEvents.at, lookback),
          sql`${productEvents.name} IN (
            'find_match',
            'seated',
            'miniapp_auth',
            'game_finished',
            'lobby_fill_invite'
          )`,
        ),
      );
    const events: ProductEvent[] = rows.map((row) => ({
      name: row.name as ProductEvent['name'],
      at: row.at,
      platform: row.platform as ProductEvent['platform'],
      userKey: row.userKey,
      roomCode: row.roomCode,
      payload: row.payload,
    }));
    return rankWarmInviteTargets(events, query);
  }

  async summarizeDigestWindow(from: Date, to: Date): Promise<DigestWindowTotals> {
    const eventUntil = new Date(to.getTime() + PRODUCT_DIGEST.fillConvertWindowMs);
    const eventRows = await this.db
      .select({
        name: productEvents.name,
        at: productEvents.at,
        platform: productEvents.platform,
        userKey: productEvents.userKey,
        roomCode: productEvents.roomCode,
        payload: productEvents.payload,
      })
      .from(productEvents)
      .where(
        and(
          gte(productEvents.at, from),
          lt(productEvents.at, eventUntil),
          sql`${productEvents.name} IN (
            'miniapp_auth',
            'seated',
            'room_join',
            'lobby_fill_invite',
            'lobby_fill_fail'
          )`,
        ),
      );

    const lobbyRows = await this.db
      .select()
      .from(productLobbies)
      .where(
        or(
          and(gte(productLobbies.openedAt, from), lt(productLobbies.openedAt, to)),
          and(gte(productLobbies.dealtAt, from), lt(productLobbies.dealtAt, to)),
          and(gte(productLobbies.diedAt, from), lt(productLobbies.diedAt, to)),
          and(gte(productLobbies.reached5At, from), lt(productLobbies.reached5At, to)),
        ),
      );

    const matchRows = await this.db
      .select()
      .from(productMatches)
      .where(
        or(
          and(gte(productMatches.startedAt, from), lt(productMatches.startedAt, to)),
          and(gte(productMatches.endedAt, from), lt(productMatches.endedAt, to)),
        ),
      );

    const events: ProductEvent[] = eventRows.map((row) => ({
      name: row.name as ProductEvent['name'],
      at: row.at,
      platform: row.platform as ProductEvent['platform'],
      userKey: row.userKey,
      roomCode: row.roomCode,
      payload: row.payload,
    }));

    const lobbies: ProductLobby[] = lobbyRows.map((row) => ({
      roomCode: row.roomCode,
      source: row.source as ProductLobby['source'],
      openedAt: row.openedAt,
      hourIran: row.hourIran,
      peakSeats: row.peakSeats,
      reached5At: row.reached5At,
      dealtAt: row.dealtAt,
      diedAt: row.diedAt,
      deathReason: row.deathReason as ProductLobby['deathReason'],
      afkKicks: row.afkKicks,
    }));

    const matches: ProductMatch[] = matchRows.map((row) => ({
      roomCode: row.roomCode,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      outcome: row.outcome as ProductMatch['outcome'],
      disconnects: row.disconnects,
      kickVotes: row.kickVotes,
      afkKicks: row.afkKicks,
    }));

    const friendRows = await this.db
      .select({ resolvedAt: friendRequests.resolvedAt })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.status, 'accepted'),
          gte(friendRequests.resolvedAt, from),
          lt(friendRequests.resolvedAt, to),
        ),
      );
    const inviteRows = await this.db
      .select({ resolvedAt: tableInvites.resolvedAt })
      .from(tableInvites)
      .where(
        and(
          eq(tableInvites.status, 'accepted'),
          gte(tableInvites.resolvedAt, from),
          lt(tableInvites.resolvedAt, to),
        ),
      );

    return {
      events,
      lobbies,
      matches,
      friendAccepts: friendRows
        .filter((row): row is { resolvedAt: Date } => row.resolvedAt != null)
        .map((row) => ({ resolvedAt: row.resolvedAt })),
      tableInviteAccepts: inviteRows
        .filter((row): row is { resolvedAt: Date } => row.resolvedAt != null)
        .map((row) => ({ resolvedAt: row.resolvedAt })),
    };
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
