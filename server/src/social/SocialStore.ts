import { makeId, type SocialPerson, type SocialRequestStatus, type TableInviteNoteId } from '@secret-hitler/shared';

export interface StoredFriendRequest {
  id: string;
  from: SocialPerson;
  to: SocialPerson;
  status: SocialRequestStatus;
  createdAt: number;
  resolvedAt: number | null;
  cooldownUntil: number | null;
}

export interface StoredTableInvite {
  id: string;
  from: SocialPerson;
  to: SocialPerson;
  noteId: TableInviteNoteId;
  roomId: string;
  roomCode: string;
  status: SocialRequestStatus;
  createdAt: number;
  resolvedAt: number | null;
  cooldownUntil: number | null;
}

export interface StoredBlock {
  blocker: string;
  blocked: SocialPerson;
  createdAt: number;
}

export interface SocialStore {
  areFriends(left: string, right: string): Promise<boolean>;
  listFriends(accountId: string): Promise<SocialPerson[]>;
  addFriendship(left: SocialPerson, right: SocialPerson): Promise<void>;
  removeFriendship(left: string, right: string): Promise<void>;

  getRequest(id: string): Promise<StoredFriendRequest | null>;
  pendingRequest(from: string, to: string): Promise<StoredFriendRequest | null>;
  latestIgnoredRequest(from: string, to: string): Promise<StoredFriendRequest | null>;
  listIncomingRequests(accountId: string): Promise<StoredFriendRequest[]>;
  listOutgoingRequests(accountId: string): Promise<StoredFriendRequest[]>;
  countRequestsSince(from: string, sinceMs: number): Promise<number>;
  insertRequest(request: StoredFriendRequest): Promise<void>;
  saveRequest(request: StoredFriendRequest): Promise<void>;

  getInvite(id: string): Promise<StoredTableInvite | null>;
  pendingInvite(from: string, to: string): Promise<StoredTableInvite | null>;
  latestIgnoredInvite(from: string, to: string): Promise<StoredTableInvite | null>;
  listIncomingInvites(accountId: string): Promise<StoredTableInvite[]>;
  listOutgoingInvites(accountId: string): Promise<StoredTableInvite[]>;
  countInvitesSince(from: string, sinceMs: number): Promise<number>;
  insertInvite(invite: StoredTableInvite): Promise<void>;
  saveInvite(invite: StoredTableInvite): Promise<void>;

  isBlockedEitherWay(left: string, right: string): Promise<boolean>;
  addBlock(blocker: string, blocked: SocialPerson): Promise<void>;
  removeBlock(blocker: string, blocked: string): Promise<void>;
  listBlocked(blocker: string): Promise<SocialPerson[]>;
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}\n${right}` : `${right}\n${left}`;
}

/** In-memory social graph for tests and embeddings without Postgres. */
export class InMemorySocialStore implements SocialStore {
  private readonly friendships = new Map<string, [SocialPerson, SocialPerson]>();
  private readonly requests: StoredFriendRequest[] = [];
  private readonly invites: StoredTableInvite[] = [];
  private readonly blocks: StoredBlock[] = [];

  async areFriends(left: string, right: string): Promise<boolean> {
    return this.friendships.has(pairKey(left, right));
  }

  async listFriends(accountId: string): Promise<SocialPerson[]> {
    const friends: SocialPerson[] = [];
    for (const [left, right] of this.friendships.values()) {
      if (left.accountId === accountId) friends.push(right);
      else if (right.accountId === accountId) friends.push(left);
    }
    return friends;
  }

  async addFriendship(left: SocialPerson, right: SocialPerson): Promise<void> {
    this.friendships.set(pairKey(left.accountId, right.accountId), [left, right]);
  }

  async removeFriendship(left: string, right: string): Promise<void> {
    this.friendships.delete(pairKey(left, right));
  }

  async getRequest(id: string): Promise<StoredFriendRequest | null> {
    return this.requests.find((request) => request.id === id) ?? null;
  }

  async pendingRequest(from: string, to: string): Promise<StoredFriendRequest | null> {
    return (
      this.requests.find(
        (request) =>
          request.status === 'pending' && request.from.accountId === from && request.to.accountId === to,
      ) ?? null
    );
  }

  async latestIgnoredRequest(from: string, to: string): Promise<StoredFriendRequest | null> {
    const matches = this.requests.filter(
      (request) =>
        request.status === 'ignored' &&
        request.from.accountId === from &&
        request.to.accountId === to,
    );
    return matches.at(-1) ?? null;
  }

  async listIncomingRequests(accountId: string): Promise<StoredFriendRequest[]> {
    return this.requests.filter(
      (request) => request.status === 'pending' && request.to.accountId === accountId,
    );
  }

  async listOutgoingRequests(accountId: string): Promise<StoredFriendRequest[]> {
    return this.requests.filter(
      (request) => request.status === 'pending' && request.from.accountId === accountId,
    );
  }

  async countRequestsSince(from: string, sinceMs: number): Promise<number> {
    return this.requests.filter(
      (request) => request.from.accountId === from && request.createdAt >= sinceMs,
    ).length;
  }

  async insertRequest(request: StoredFriendRequest): Promise<void> {
    this.requests.push(request);
  }

  async saveRequest(request: StoredFriendRequest): Promise<void> {
    const index = this.requests.findIndex((row) => row.id === request.id);
    if (index >= 0) this.requests[index] = request;
  }

  async getInvite(id: string): Promise<StoredTableInvite | null> {
    return this.invites.find((invite) => invite.id === id) ?? null;
  }

  async pendingInvite(from: string, to: string): Promise<StoredTableInvite | null> {
    return (
      this.invites.find(
        (invite) =>
          invite.status === 'pending' && invite.from.accountId === from && invite.to.accountId === to,
      ) ?? null
    );
  }

  async latestIgnoredInvite(from: string, to: string): Promise<StoredTableInvite | null> {
    const matches = this.invites.filter(
      (invite) =>
        invite.status === 'ignored' && invite.from.accountId === from && invite.to.accountId === to,
    );
    return matches.at(-1) ?? null;
  }

  async listIncomingInvites(accountId: string): Promise<StoredTableInvite[]> {
    return this.invites.filter(
      (invite) => invite.status === 'pending' && invite.to.accountId === accountId,
    );
  }

  async listOutgoingInvites(accountId: string): Promise<StoredTableInvite[]> {
    return this.invites.filter(
      (invite) => invite.status === 'pending' && invite.from.accountId === accountId,
    );
  }

  async countInvitesSince(from: string, sinceMs: number): Promise<number> {
    return this.invites.filter(
      (invite) => invite.from.accountId === from && invite.createdAt >= sinceMs,
    ).length;
  }

  async insertInvite(invite: StoredTableInvite): Promise<void> {
    this.invites.push(invite);
  }

  async saveInvite(invite: StoredTableInvite): Promise<void> {
    const index = this.invites.findIndex((row) => row.id === invite.id);
    if (index >= 0) this.invites[index] = invite;
  }

  async isBlockedEitherWay(left: string, right: string): Promise<boolean> {
    return this.blocks.some(
      (block) =>
        (block.blocker === left && block.blocked.accountId === right) ||
        (block.blocker === right && block.blocked.accountId === left),
    );
  }

  async addBlock(blocker: string, blocked: SocialPerson): Promise<void> {
    await this.removeFriendship(blocker, blocked.accountId);
    if (this.blocks.some((block) => block.blocker === blocker && block.blocked.accountId === blocked.accountId)) {
      return;
    }
    this.blocks.push({ blocker, blocked, createdAt: Date.now() });
  }

  async removeBlock(blocker: string, blocked: string): Promise<void> {
    const index = this.blocks.findIndex(
      (block) => block.blocker === blocker && block.blocked.accountId === blocked,
    );
    if (index >= 0) this.blocks.splice(index, 1);
  }

  async listBlocked(blocker: string): Promise<SocialPerson[]> {
    return this.blocks.filter((block) => block.blocker === blocker).map((block) => block.blocked);
  }
}

export function newRequestId(): string {
  return makeId();
}

export function newInviteId(): string {
  return makeId();
}
