import {
  SOCIAL_IGNORE_COOLDOWN_MS,
  SOCIAL_INVITE_DAILY_LIMIT,
  SOCIAL_REQUEST_DAILY_LIMIT,
  err,
  type EngineError,
  type SocialPerson,
  type TableInviteNoteId,
} from '@secret-hitler/shared';
import {
  newInviteId,
  newRequestId,
  type SocialStore,
  type StoredFriendRequest,
  type StoredTableInvite,
} from './SocialStore';

export interface SharedMatchLookup {
  satTogether(leftKey: string, rightKey: string): Promise<boolean>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Friend requests and table invites: one pending, ignore cooldown, daily cap, block. */
export class SocialBook {
  constructor(
    private readonly store: SocialStore,
    private readonly matches: SharedMatchLookup,
    private readonly now: () => number = Date.now,
  ) {}

  async requestFriend(from: SocialPerson, to: SocialPerson): Promise<EngineError | StoredFriendRequest> {
    const denied = await this.denyPair(from.accountId, to.accountId);
    if (denied) return denied;
    if (await this.store.areFriends(from.accountId, to.accountId)) {
      return err('SOCIAL_ALREADY', 'You are already friends.');
    }
    if (await this.store.pendingRequest(from.accountId, to.accountId)) {
      return err('SOCIAL_PENDING', 'There is already an open request.');
    }
    if (await this.store.pendingRequest(to.accountId, from.accountId)) {
      return err('SOCIAL_PENDING', 'They already asked you. Accept that request.');
    }
    const ignored = await this.store.latestIgnoredRequest(from.accountId, to.accountId);
    if (ignored?.cooldownUntil != null && ignored.cooldownUntil > this.now()) {
      return err('SOCIAL_COOLDOWN', 'Wait a day before asking again.');
    }
    const since = this.now() - DAY_MS;
    if ((await this.store.countRequestsSince(from.accountId, since)) >= SOCIAL_REQUEST_DAILY_LIMIT) {
      return err('SOCIAL_LIMIT', 'You have sent enough requests for today.');
    }
    const request: StoredFriendRequest = {
      id: newRequestId(),
      from,
      to,
      status: 'pending',
      createdAt: this.now(),
      resolvedAt: null,
      cooldownUntil: null,
    };
    await this.store.insertRequest(request);
    return request;
  }

  async acceptFriendRequest(id: string, actorId: string): Promise<EngineError | null> {
    const request = await this.store.getRequest(id);
    if (!request || request.status !== 'pending' || request.to.accountId !== actorId) {
      return err('INVALID_ACTION', 'That request is not yours to accept.');
    }
    request.status = 'accepted';
    request.resolvedAt = this.now();
    await this.store.saveRequest(request);
    await this.store.addFriendship(request.from, request.to);
    return null;
  }

  async ignoreFriendRequest(id: string, actorId: string): Promise<EngineError | null> {
    const request = await this.store.getRequest(id);
    if (!request || request.status !== 'pending' || request.to.accountId !== actorId) {
      return err('INVALID_ACTION', 'That request is not yours to ignore.');
    }
    request.status = 'ignored';
    request.resolvedAt = this.now();
    request.cooldownUntil = this.now() + SOCIAL_IGNORE_COOLDOWN_MS;
    await this.store.saveRequest(request);
    return null;
  }

  async sendInvite(
    from: SocialPerson,
    to: SocialPerson,
    noteId: TableInviteNoteId,
    room: { id: string; code: string },
  ): Promise<EngineError | StoredTableInvite> {
    const denied = await this.denyPair(from.accountId, to.accountId);
    if (denied) return denied;
    const friends = await this.store.areFriends(from.accountId, to.accountId);
    const shared = await this.matches.satTogether(from.accountId, to.accountId);
    if (!friends && !shared) {
      return err('SOCIAL_STRANGER', 'You can only invite friends, or people you have sat with.');
    }
    if (await this.store.pendingInvite(from.accountId, to.accountId)) {
      return err('SOCIAL_PENDING', 'There is already an open invite.');
    }
    const ignored = await this.store.latestIgnoredInvite(from.accountId, to.accountId);
    if (ignored?.cooldownUntil != null && ignored.cooldownUntil > this.now()) {
      return err('SOCIAL_COOLDOWN', 'Wait a day before inviting them again.');
    }
    const since = this.now() - DAY_MS;
    if ((await this.store.countInvitesSince(from.accountId, since)) >= SOCIAL_INVITE_DAILY_LIMIT) {
      return err('SOCIAL_LIMIT', 'You have sent enough invites for today.');
    }
    const invite: StoredTableInvite = {
      id: newInviteId(),
      from,
      to,
      noteId,
      roomId: room.id,
      roomCode: room.code,
      status: 'pending',
      createdAt: this.now(),
      resolvedAt: null,
      cooldownUntil: null,
    };
    await this.store.insertInvite(invite);
    return invite;
  }

  async acceptInvite(id: string, actorId: string): Promise<EngineError | StoredTableInvite> {
    const invite = await this.store.getInvite(id);
    if (!invite || invite.status !== 'pending' || invite.to.accountId !== actorId) {
      return err('INVALID_ACTION', 'That invite is not yours to accept.');
    }
    invite.status = 'accepted';
    invite.resolvedAt = this.now();
    await this.store.saveInvite(invite);
    return invite;
  }

  async ignoreInvite(id: string, actorId: string): Promise<EngineError | null> {
    const invite = await this.store.getInvite(id);
    if (!invite || invite.status !== 'pending' || invite.to.accountId !== actorId) {
      return err('INVALID_ACTION', 'That invite is not yours to ignore.');
    }
    invite.status = 'ignored';
    invite.resolvedAt = this.now();
    invite.cooldownUntil = this.now() + SOCIAL_IGNORE_COOLDOWN_MS;
    await this.store.saveInvite(invite);
    return null;
  }

  async tieStatus(from: string, to: string): Promise<
    'none' | 'outgoing' | 'incoming' | 'friends' | 'blocked'
  > {
    if (await this.store.isBlockedEitherWay(from, to)) return 'blocked';
    if (await this.store.areFriends(from, to)) return 'friends';
    if (await this.store.pendingRequest(from, to)) return 'outgoing';
    if (await this.store.pendingRequest(to, from)) return 'incoming';
    return 'none';
  }

  async snapshot(accountId: string) {
    const [
      friends,
      incomingRequests,
      outgoingRequests,
      incomingInvites,
      outgoingInvites,
      blocked,
    ] = await Promise.all([
      this.store.listFriends(accountId),
      this.store.listIncomingRequests(accountId),
      this.store.listOutgoingRequests(accountId),
      this.store.listIncomingInvites(accountId),
      this.store.listOutgoingInvites(accountId),
      this.store.listBlocked(accountId),
    ]);
    return {
      friends,
      incomingRequests,
      outgoingRequests,
      incomingInvites,
      outgoingInvites,
      blocked,
    };
  }

  async block(blocker: SocialPerson, blocked: SocialPerson): Promise<EngineError | null> {
    if (blocker.accountId === blocked.accountId) {
      return err('INVALID_ACTION', 'You cannot block yourself.');
    }
    await this.store.addBlock(blocker.accountId, blocked);
    return null;
  }

  private async denyPair(left: string, right: string): Promise<EngineError | null> {
    if (!left || !right || left === right) {
      return err('INVALID_ACTION', 'That person cannot be reached.');
    }
    if (await this.store.isBlockedEitherWay(left, right)) {
      return err('SOCIAL_BLOCKED', 'That connection is closed.');
    }
    return null;
  }
}

export function isEngineError(value: unknown): value is EngineError {
  return (
    typeof value === 'object' &&
    value != null &&
    'code' in value &&
    'message' in value &&
    typeof (value as EngineError).code === 'string' &&
    typeof (value as EngineError).message === 'string' &&
    !('id' in value)
  );
}
