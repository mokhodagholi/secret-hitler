import { describe, expect, it } from '@rstest/core';
import type { SocialInviteSendResponse, SocialListResponse } from '@secret-hitler/shared';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';
import { InMemorySocialStore } from '../social/SocialStore';
import { SocialBook } from '../social/SocialBook';
import { InMemoryGameHistoryStore } from '../history/InMemoryGameHistoryStore';

const ANA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BEN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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
});
