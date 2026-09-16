import { createHmac } from 'node:crypto';
import { describe, expect, it } from '@rstest/core';
import type {
  CreateRoomResponse,
  SocialInviteSendResponse,
  SocialListResponse,
} from '@secret-hitler/shared';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';
import { InMemorySocialStore } from '../social/SocialStore';
import { SocialBook } from '../social/SocialBook';
import { InMemoryGameHistoryStore } from '../history/InMemoryGameHistoryStore';
import { BaleSeatIndex } from '../bale/BaleSeatIndex';
import type { BaleRuntime } from '../bale/webhook';

const ANA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BEN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CAL = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const BALE_TOKEN = '123456:test-token';

function signInitData(userId: number, firstName: string): string {
  const fields = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: firstName }),
  };
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(BALE_TOKEN).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

describe('social HTTP', () => {
  it('Should list a friend and invite them into the current lobby', async () => {
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

    const created = await httpJson<CreateRoomResponse>(app, 'POST', '/api/rooms', {
      name: 'Ana',
      hostName: 'Ana',
      avatar: 0,
      clientId: ANA,
    });
    expect(created.status).toBe(201);

    const invited = await httpJson<SocialInviteSendResponse>(app, 'POST', '/api/social/invites', {
      clientId: ANA,
      name: 'Ana',
      avatar: 0,
      accountId: `client:${BEN}`,
      noteId: 'emptySeat',
    });
    expect(invited.status).toBe(200);
    expect(invited.body.invite.noteId).toBe('emptySeat');
    expect(invited.body.invite.roomCode).toBe(created.body.code);
  });

  it('Should DM a Bale friend the lobby invite with an open button', async () => {
    const store = new InMemorySocialStore();
    await store.addFriendship(
      { accountId: 'bale:9', name: 'Ana', avatar: 0 },
      { accountId: 'bale:11', name: 'Ben', avatar: 1 },
    );
    const sent: Array<{ chat_id: number | string; text: string; reply_markup?: unknown }> = [];
    const bale: BaleRuntime = {
      botToken: BALE_TOKEN,
      botUsername: '@secret_hitler_bot',
      seats: new BaleSeatIndex(),
      bot: {
        sendMessage: async (params) => {
          sent.push(params);
          return { message_id: 1 };
        },
      },
    };
    const history = new InMemoryGameHistoryStore();
    const { app } = await buildServer({
      minPlayers: 3,
      history,
      social: new SocialBook(store, history),
      bale,
    });

    const created = await httpJson<CreateRoomResponse>(app, 'POST', '/api/rooms', {
      name: 'Ana',
      hostName: 'Ana',
      avatar: 0,
      initData: signInitData(9, 'Ana'),
    });
    expect(created.status).toBe(201);

    const invited = await httpJson<SocialInviteSendResponse>(app, 'POST', '/api/social/invites', {
      name: 'Ana',
      avatar: 0,
      initData: signInitData(9, 'Ana'),
      accountId: 'bale:11',
      noteId: 'emptySeat',
    });
    expect(invited.status).toBe(200);
    expect(invited.body.invite.roomCode).toBe(created.body.code);

    expect(sent).toHaveLength(1);
    expect(sent[0]?.chat_id).toBe(11);
    expect(sent[0]?.text).toContain('Ana');
    expect(sent[0]?.text).toContain(created.body.code);
    const button = (
      sent[0]?.reply_markup as {
        inline_keyboard: Array<Array<{ text: string; url: string }>>;
      }
    ).inline_keyboard[0]?.[0];
    expect(button?.text).toBe('ورود به اتاق');
    expect(button?.url).toBe(
      `https://ble.ir/secret_hitler_bot?startapp=${created.body.code}`,
    );
  });

  it('Should refuse an invite when the caller is not in a lobby', async () => {
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
    const invited = await httpJson<{ code?: string }>(app, 'POST', '/api/social/invites', {
      clientId: ANA,
      name: 'Ana',
      avatar: 0,
      accountId: `client:${BEN}`,
      noteId: 'emptySeat',
    });
    expect(invited.status).toBe(400);
    expect(invited.body.code).toBe('INVALID_ACTION');
  });

  it('Should refuse an invite to a stranger', async () => {
    const { app } = await buildServer({ minPlayers: 3 });
    const created = await httpJson<CreateRoomResponse>(app, 'POST', '/api/rooms', {
      name: 'Ana',
      hostName: 'Ana',
      avatar: 0,
      clientId: ANA,
    });
    expect(created.status).toBe(201);
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
