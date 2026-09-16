import { describe, expect, it } from '@rstest/core';
import {
  SOCIAL_IGNORE_COOLDOWN_MS,
  SOCIAL_INVITE_DAILY_LIMIT,
  type SocialPerson,
} from '@secret-hitler/shared';
import { isEngineError, SocialBook } from './SocialBook';
import { InMemorySocialStore } from './SocialStore';

const ANA: SocialPerson = { accountId: 'client:ana', name: 'Ana', avatar: 0 };
const BEN: SocialPerson = { accountId: 'client:ben', name: 'Ben', avatar: 1 };

function book(options: { now?: () => number; satTogether?: boolean } = {}) {
  const store = new InMemorySocialStore();
  const social = new SocialBook(
    store,
    { satTogether: async () => options.satTogether === true },
    options.now ?? (() => 1_000),
  );
  return { store, social };
}

describe('SocialBook — friends', () => {
  it('Should accept a friend request and list both sides', async () => {
    const { store, social } = book();
    const request = await social.requestFriend(ANA, BEN);
    if (isEngineError(request)) throw new Error(request.code);
    expect(await social.acceptFriendRequest(request.id, BEN.accountId)).toBeNull();
    expect(await store.areFriends(ANA.accountId, BEN.accountId)).toBe(true);
    expect(await store.listFriends(ANA.accountId)).toEqual([BEN]);
    expect(await store.listFriends(BEN.accountId)).toEqual([ANA]);
  });

  it('Should refuse a second pending request to the same person', async () => {
    const { social } = book();
    await social.requestFriend(ANA, BEN);
    const again = await social.requestFriend(ANA, BEN);
    expect(isEngineError(again) && again.code).toBe('SOCIAL_PENDING');
  });

  it('Should cooldown a new request for a day after ignore', async () => {
    let now = 5_000;
    const { social } = book({ now: () => now });
    const request = await social.requestFriend(ANA, BEN);
    if (isEngineError(request)) throw new Error(request.code);
    expect(await social.ignoreFriendRequest(request.id, BEN.accountId)).toBeNull();
    const tooSoon = await social.requestFriend(ANA, BEN);
    expect(isEngineError(tooSoon) && tooSoon.code).toBe('SOCIAL_COOLDOWN');
    now += SOCIAL_IGNORE_COOLDOWN_MS + 1;
    const later = await social.requestFriend(ANA, BEN);
    expect(isEngineError(later)).toBe(false);
  });
});

describe('SocialBook — table invites', () => {
  it('Should invite a friend to a hosted room', async () => {
    const { store, social } = book();
    const request = await social.requestFriend(ANA, BEN);
    if (isEngineError(request)) throw new Error(request.code);
    await social.acceptFriendRequest(request.id, BEN.accountId);
    const invite = await social.sendInvite(ANA, BEN, 'emptySeat', { id: 'room-1', code: 'ABC123' });
    if (isEngineError(invite)) throw new Error(invite.code);
    expect(invite.noteId).toBe('emptySeat');
    expect(await store.pendingInvite(ANA.accountId, BEN.accountId)).toMatchObject({ id: invite.id });
  });

  it('Should refuse an invite to a stranger who never sat with you', async () => {
    const { social } = book({ satTogether: false });
    const invite = await social.sendInvite(ANA, BEN, 'emptySeat', { id: 'room-1', code: 'ABC123' });
    expect(isEngineError(invite) && invite.code).toBe('SOCIAL_STRANGER');
  });

  it('Should invite someone from a shared match without friendship', async () => {
    const { social } = book({ satTogether: true });
    const invite = await social.sendInvite(ANA, BEN, 'anotherHand', { id: 'room-1', code: 'ABC123' });
    expect(isEngineError(invite)).toBe(false);
  });

  it('Should refuse a second pending invite to the same person', async () => {
    const { social } = book({ satTogether: true });
    const first = await social.sendInvite(ANA, BEN, 'emptySeat', { id: 'r', code: 'AAAAAA' });
    if (isEngineError(first)) throw new Error(first.code);
    const piled = await social.sendInvite(ANA, BEN, 'emptySeat', { id: 'r', code: 'AAAAAA' });
    expect(isEngineError(piled) && piled.code).toBe('SOCIAL_PENDING');
  });

  it('Should cap a day at ten invites', async () => {
    const { social } = book({ satTogether: true });
    for (let count = 0; count < SOCIAL_INVITE_DAILY_LIMIT; count += 1) {
      const other: SocialPerson = { accountId: `client:${count}`, name: `P${count}`, avatar: 0 };
      const sent = await social.sendInvite(ANA, other, 'emptySeat', { id: 'r', code: 'AAAAAA' });
      if (isEngineError(sent)) throw new Error(sent.code);
      await social.ignoreInvite(sent.id, other.accountId);
    }
    const over = await social.sendInvite(ANA, BEN, 'emptySeat', { id: 'r', code: 'AAAAAA' });
    expect(isEngineError(over) && over.code).toBe('SOCIAL_LIMIT');
  });

  it('Should stop invites after a block', async () => {
    const { social } = book({ satTogether: true });
    expect(await social.block(BEN, ANA)).toBeNull();
    const invite = await social.sendInvite(ANA, BEN, 'emptySeat', { id: 'r', code: 'AAAAAA' });
    expect(isEngineError(invite) && invite.code).toBe('SOCIAL_BLOCKED');
  });
});
