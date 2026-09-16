import { and, desc, eq, gte, or } from 'drizzle-orm';
import {
  type SocialPerson,
  type SocialRequestStatus,
  type TableInviteNoteId,
} from '@secret-hitler/shared';
import { connectDatabase, type Database, type DbConnection } from '../db/connection';
import { friendRequests, friendships, socialBlocks, tableInvites } from '../db/schema';
import type {
  SocialStore,
  StoredBlock,
  StoredFriendRequest,
  StoredTableInvite,
} from './SocialStore';

function pair(left: string, right: string): { low: string; high: string } {
  return left < right ? { low: left, high: right } : { low: right, high: left };
}

function asStatus(value: string): SocialRequestStatus {
  if (value === 'accepted' || value === 'ignored') return value;
  return 'pending';
}

function requestFromRow(row: typeof friendRequests.$inferSelect): StoredFriendRequest {
  return {
    id: row.id,
    from: { accountId: row.fromAccount, name: row.fromName, avatar: row.fromAvatar },
    to: { accountId: row.toAccount, name: row.toName, avatar: row.toAvatar },
    status: asStatus(row.status),
    createdAt: row.createdAt.getTime(),
    resolvedAt: row.resolvedAt?.getTime() ?? null,
    cooldownUntil: row.cooldownUntil?.getTime() ?? null,
  };
}

function inviteFromRow(row: typeof tableInvites.$inferSelect): StoredTableInvite {
  return {
    id: row.id,
    from: { accountId: row.fromAccount, name: row.fromName, avatar: row.fromAvatar },
    to: { accountId: row.toAccount, name: row.toName, avatar: row.toAvatar },
    noteId: row.noteId as TableInviteNoteId,
    roomId: row.roomId,
    roomCode: row.roomCode,
    status: asStatus(row.status),
    createdAt: row.createdAt.getTime(),
    resolvedAt: row.resolvedAt?.getTime() ?? null,
    cooldownUntil: row.cooldownUntil?.getTime() ?? null,
  };
}

/** Postgres-backed {@link SocialStore}. */
export class DrizzleSocialStore implements SocialStore {
  private readonly db: Database;
  private readonly close_: () => Promise<void>;

  constructor(connection: DbConnection) {
    this.db = connection.db;
    this.close_ = () => connection.pool.end();
  }

  static fromUrl(connectionString: string): DrizzleSocialStore {
    return new DrizzleSocialStore(connectDatabase(connectionString));
  }

  async areFriends(left: string, right: string): Promise<boolean> {
    const { low, high } = pair(left, right);
    const rows = await this.db
      .select({ id: friendships.id })
      .from(friendships)
      .where(and(eq(friendships.accountLow, low), eq(friendships.accountHigh, high)))
      .limit(1);
    return rows.length > 0;
  }

  async listFriends(accountId: string): Promise<SocialPerson[]> {
    const rows = await this.db
      .select()
      .from(friendships)
      .where(or(eq(friendships.accountLow, accountId), eq(friendships.accountHigh, accountId)));
    return rows.map((row) =>
      row.accountLow === accountId
        ? { accountId: row.accountHigh, name: row.highName, avatar: row.highAvatar }
        : { accountId: row.accountLow, name: row.lowName, avatar: row.lowAvatar },
    );
  }

  async addFriendship(left: SocialPerson, right: SocialPerson): Promise<void> {
    const ordered = left.accountId < right.accountId;
    const low = ordered ? left : right;
    const high = ordered ? right : left;
    await this.db
      .insert(friendships)
      .values({
        accountLow: low.accountId,
        accountHigh: high.accountId,
        lowName: low.name,
        lowAvatar: low.avatar,
        highName: high.name,
        highAvatar: high.avatar,
      })
      .onConflictDoNothing({ target: [friendships.accountLow, friendships.accountHigh] });
  }

  async removeFriendship(left: string, right: string): Promise<void> {
    const { low, high } = pair(left, right);
    await this.db
      .delete(friendships)
      .where(and(eq(friendships.accountLow, low), eq(friendships.accountHigh, high)));
  }

  async getRequest(id: string): Promise<StoredFriendRequest | null> {
    const [row] = await this.db.select().from(friendRequests).where(eq(friendRequests.id, id)).limit(1);
    return row ? requestFromRow(row) : null;
  }

  async pendingRequest(from: string, to: string): Promise<StoredFriendRequest | null> {
    const [row] = await this.db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.fromAccount, from),
          eq(friendRequests.toAccount, to),
          eq(friendRequests.status, 'pending'),
        ),
      )
      .limit(1);
    return row ? requestFromRow(row) : null;
  }

  async latestIgnoredRequest(from: string, to: string): Promise<StoredFriendRequest | null> {
    const [row] = await this.db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.fromAccount, from),
          eq(friendRequests.toAccount, to),
          eq(friendRequests.status, 'ignored'),
        ),
      )
      .orderBy(desc(friendRequests.resolvedAt))
      .limit(1);
    return row ? requestFromRow(row) : null;
  }

  async listIncomingRequests(accountId: string): Promise<StoredFriendRequest[]> {
    const rows = await this.db
      .select()
      .from(friendRequests)
      .where(and(eq(friendRequests.toAccount, accountId), eq(friendRequests.status, 'pending')));
    return rows.map(requestFromRow);
  }

  async listOutgoingRequests(accountId: string): Promise<StoredFriendRequest[]> {
    const rows = await this.db
      .select()
      .from(friendRequests)
      .where(and(eq(friendRequests.fromAccount, accountId), eq(friendRequests.status, 'pending')));
    return rows.map(requestFromRow);
  }

  async countRequestsSince(from: string, sinceMs: number): Promise<number> {
    const rows = await this.db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(and(eq(friendRequests.fromAccount, from), gte(friendRequests.createdAt, new Date(sinceMs))));
    return rows.length;
  }

  async insertRequest(request: StoredFriendRequest): Promise<void> {
    await this.db.insert(friendRequests).values({
      id: request.id,
      fromAccount: request.from.accountId,
      toAccount: request.to.accountId,
      fromName: request.from.name,
      fromAvatar: request.from.avatar,
      toName: request.to.name,
      toAvatar: request.to.avatar,
      status: request.status,
      createdAt: new Date(request.createdAt),
      resolvedAt: request.resolvedAt != null ? new Date(request.resolvedAt) : null,
      cooldownUntil: request.cooldownUntil != null ? new Date(request.cooldownUntil) : null,
    });
  }

  async saveRequest(request: StoredFriendRequest): Promise<void> {
    await this.db
      .update(friendRequests)
      .set({
        status: request.status,
        resolvedAt: request.resolvedAt != null ? new Date(request.resolvedAt) : null,
        cooldownUntil: request.cooldownUntil != null ? new Date(request.cooldownUntil) : null,
      })
      .where(eq(friendRequests.id, request.id));
  }

  async getInvite(id: string): Promise<StoredTableInvite | null> {
    const [row] = await this.db.select().from(tableInvites).where(eq(tableInvites.id, id)).limit(1);
    return row ? inviteFromRow(row) : null;
  }

  async pendingInvite(from: string, to: string): Promise<StoredTableInvite | null> {
    const [row] = await this.db
      .select()
      .from(tableInvites)
      .where(
        and(
          eq(tableInvites.fromAccount, from),
          eq(tableInvites.toAccount, to),
          eq(tableInvites.status, 'pending'),
        ),
      )
      .limit(1);
    return row ? inviteFromRow(row) : null;
  }

  async latestIgnoredInvite(from: string, to: string): Promise<StoredTableInvite | null> {
    const [row] = await this.db
      .select()
      .from(tableInvites)
      .where(
        and(
          eq(tableInvites.fromAccount, from),
          eq(tableInvites.toAccount, to),
          eq(tableInvites.status, 'ignored'),
        ),
      )
      .orderBy(desc(tableInvites.resolvedAt))
      .limit(1);
    return row ? inviteFromRow(row) : null;
  }

  async listIncomingInvites(accountId: string): Promise<StoredTableInvite[]> {
    const rows = await this.db
      .select()
      .from(tableInvites)
      .where(and(eq(tableInvites.toAccount, accountId), eq(tableInvites.status, 'pending')));
    return rows.map(inviteFromRow);
  }

  async listOutgoingInvites(accountId: string): Promise<StoredTableInvite[]> {
    const rows = await this.db
      .select()
      .from(tableInvites)
      .where(and(eq(tableInvites.fromAccount, accountId), eq(tableInvites.status, 'pending')));
    return rows.map(inviteFromRow);
  }

  async countInvitesSince(from: string, sinceMs: number): Promise<number> {
    const rows = await this.db
      .select({ id: tableInvites.id })
      .from(tableInvites)
      .where(and(eq(tableInvites.fromAccount, from), gte(tableInvites.createdAt, new Date(sinceMs))));
    return rows.length;
  }

  async insertInvite(invite: StoredTableInvite): Promise<void> {
    await this.db.insert(tableInvites).values({
      id: invite.id,
      fromAccount: invite.from.accountId,
      toAccount: invite.to.accountId,
      fromName: invite.from.name,
      fromAvatar: invite.from.avatar,
      toName: invite.to.name,
      toAvatar: invite.to.avatar,
      noteId: invite.noteId,
      roomId: invite.roomId,
      roomCode: invite.roomCode,
      status: invite.status,
      createdAt: new Date(invite.createdAt),
      resolvedAt: invite.resolvedAt != null ? new Date(invite.resolvedAt) : null,
      cooldownUntil: invite.cooldownUntil != null ? new Date(invite.cooldownUntil) : null,
    });
  }

  async saveInvite(invite: StoredTableInvite): Promise<void> {
    await this.db
      .update(tableInvites)
      .set({
        status: invite.status,
        resolvedAt: invite.resolvedAt != null ? new Date(invite.resolvedAt) : null,
        cooldownUntil: invite.cooldownUntil != null ? new Date(invite.cooldownUntil) : null,
      })
      .where(eq(tableInvites.id, invite.id));
  }

  async isBlockedEitherWay(left: string, right: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: socialBlocks.id })
      .from(socialBlocks)
      .where(
        or(
          and(eq(socialBlocks.blocker, left), eq(socialBlocks.blocked, right)),
          and(eq(socialBlocks.blocker, right), eq(socialBlocks.blocked, left)),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async addBlock(blocker: string, blocked: SocialPerson): Promise<void> {
    await this.removeFriendship(blocker, blocked.accountId);
    await this.db
      .insert(socialBlocks)
      .values({
        blocker,
        blocked: blocked.accountId,
        blockedName: blocked.name,
        blockedAvatar: blocked.avatar,
      })
      .onConflictDoNothing({ target: [socialBlocks.blocker, socialBlocks.blocked] });
  }

  async removeBlock(blocker: string, blocked: string): Promise<void> {
    await this.db
      .delete(socialBlocks)
      .where(and(eq(socialBlocks.blocker, blocker), eq(socialBlocks.blocked, blocked)));
  }

  async listBlocked(blocker: string): Promise<SocialPerson[]> {
    const rows = await this.db.select().from(socialBlocks).where(eq(socialBlocks.blocker, blocker));
    return rows.map((row) => ({
      accountId: row.blocked,
      name: row.blockedName,
      avatar: row.blockedAvatar,
    }));
  }

  close(): Promise<void> {
    return this.close_();
  }
}

export type { StoredBlock };
