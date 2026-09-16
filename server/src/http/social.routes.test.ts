import { describe, expect, it } from '@rstest/core';
import type { SocialInviteSendResponse, SocialListResponse } from '@secret-hitler/shared';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';
import { InMemorySocialStore } from '../social/SocialStore';
import { SocialBook } from '../social/SocialBook';
import { InMemoryGameHistoryStore } from '../history/InMemoryGameHistoryStore';

const ANA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BEN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CAL = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('social HTTP', () => {
  it('Should list a friend and send a table invite from home', async () => {
    const store = new InMemorySocialStore();
    await store.addFriendship(
      { accountId: `client:${ANA}`, name: 'Ana', avatar: 0 },
      { accountId: `client:${BEN}`, name: 'Ben', avatar: 1 },
    );
    const history = new InMemoryGameHistoryStore();
    const { app } = await buildServer({
      minPlayers: 3,
      history,
      social: new SocialBook(store, history),
    });

    const list = await httpJson<SocialListResponse>(app, 'POST', '/api/social/list', {
      clientId: ANA,
      name: 'Ana',
      avatar: 0,
    });
    expect(list.status).toBe(200);
    expect(list.body.friends).toEqual([{ accountId: `client:${BEN}`, name: 'Ben', avatar: 1 }]);

    const invited = await httpJson<SocialInviteSendResponse>(app, 'POST', '/api/social/invites', {
      clientId: ANA,
      name: 'Ana',
      avatar: 0,
      accountId: `client:${BEN}`,
      noteId: 'emptySeat',
    });
    expect(invited.status).toBe(200);
    expect(invited.body.invite.noteId).toBe('emptySeat');
    expect(invited.body.seat?.playerId).toBeTruthy();
    expect(invited.body.seat?.code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('Should refuse an invite to a stranger', async () => {
    const { app } = await buildServer({ minPlayers: 3 });
    const invited = await httpJson<{ code?: string }>(app, 'POST', '/api/social/invites', {
      clientId: ANA,
      name: 'Ana',
      avatar: 0,
      accountId: `client:${BEN}`,
      noteId: 'emptySeat',
    });
    expect(invited.status).toBe(400);
    expect(invited.body.code).toBe('SOCIAL_STRANGER');
  });

  it('Should send a friend request from a shared finished match', async () => {
    const history = new InMemoryGameHistoryStore();
    await history.saveGame({
      roomCode: 'ABC123',
      roomName: 'Friday Night',
      winner: 'liberal',
      playerCount: 3,
      liberalPolicies: 5,
      fascistPolicies: 0,
      players: [
        { name: 'Ana', role: 'liberal', seat: 0, won: true, joinKey: `client:${ANA}` },
        { name: 'Ben', role: 'fascist', seat: 1, won: false, joinKey: `client:${BEN}` },
        { name: 'Cal', role: 'hitler', seat: 2, won: false, joinKey: null },
      ],
    });
    const { app } = await buildServer({
      minPlayers: 3,
      history,
      social: new SocialBook(new InMemorySocialStore(), history),
    });

    const asked = await httpJson<{ to?: { accountId: string }; code?: string }>(
      app,
      'POST',
      '/api/social/friends',
      {
        clientId: ANA,
        name: 'Ana',
        avatar: 0,
        accountId: `client:${BEN}`,
      },
    );
    expect(asked.status).toBe(200);
    expect(asked.body.to?.accountId).toBe(`client:${BEN}`);
  });

  it('Should refuse a friend request to someone you never sat with', async () => {
    const { app } = await buildServer({ minPlayers: 3 });
    const asked = await httpJson<{ code?: string }>(app, 'POST', '/api/social/friends', {
      clientId: ANA,
      name: 'Ana',
      avatar: 0,
      accountId: `client:${CAL}`,
    });
    expect(asked.status).toBe(400);
    expect(asked.body.code).toBe('SOCIAL_STRANGER');
  });
});
