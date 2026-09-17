import { describe, expect, it } from '@rstest/core';
import { createHmac } from 'node:crypto';
import {
  DEFAULT_FLAGS,
  type CreateRoomResponse,
  type FlagsResponse,
  type JoinRoomResponse,
  type RoomSummary,
} from '@secret-hitler/shared';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';
import { BaleSeatIndex } from '../bale/BaleSeatIndex';
import { InMemoryProductStore } from '../product/InMemoryProductStore';

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

async function createRoom(
  app: Awaited<ReturnType<typeof buildServer>>['app'],
  overrides: Record<string, unknown> = {},
) {
  return httpJson<CreateRoomResponse>(app, 'POST', '/api/rooms', {
    name: 'Friday Night',
    hostName: 'Ana',
    ...overrides,
  });
}

describe('room HTTP endpoints', () => {
  it('Should create a room and seat the host with a join token', async () => {
    const { app } = await buildServer();
    const { status, body } = await createRoom(app);

    expect(status).toBe(201);
    expect(body.roomId).toBeTruthy();
    expect(body.token).toBeTruthy();
    expect(body.playerId).toBeTruthy();
    expect(body.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(body.shareLink).toContain(`/join/${body.code}`);
    expect(body.shareLink).not.toContain('ble.ir');
  });

  it('Should return a Bale startapp invite when the request is not loopback', async () => {
    const { app } = await buildServer();
    const response = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      headers: { host: 'mrfantastic.ir' },
      payload: { name: 'Friday Night', hostName: 'Ana' },
    });
    const body = response.json() as CreateRoomResponse;
    expect(response.statusCode).toBe(201);
    expect(body.shareLink).toBe(
      `https://ble.ir/secret_hitler_bot?startapp=${body.code}`,
    );
  });

  it('Should reject room creation without a name or host name', async () => {
    const { app } = await buildServer();
    expect((await createRoom(app, { name: '   ' })).status).toBe(400);
    expect((await createRoom(app, { hostName: '' })).status).toBe(400);
  });

  it('Should list open lobby rooms with their player counts', async () => {
    const { app } = await buildServer();
    await createRoom(app);
    const { body } = await httpJson<RoomSummary[]>(app, 'GET', '/api/rooms');

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      name: 'Friday Night',
      playerCount: 1,
      hasPassword: false,
    });
  });

  it('Should let a player join by the human-readable room code', async () => {
    const { app } = await buildServer();
    const created = (await createRoom(app)).body;

    const joined = await httpJson<JoinRoomResponse>(
      app,
      'POST',
      `/api/rooms/${created.code}/join`,
      { name: 'Ben' },
    );
    expect(joined.status).toBe(200);
    expect(joined.body.roomId).toBe(created.roomId);
    expect(joined.body.playerId).not.toBe(created.playerId);
  });

  it('Should record create and join on the product funnel', async () => {
    const product = new InMemoryProductStore();
    const { app, product: tracker } = await buildServer({ product });
    const created = (await createRoom(app, { clientId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }))
      .body;
    await httpJson<JoinRoomResponse>(app, 'POST', `/api/rooms/${created.code}/join`, {
      name: 'Ben',
      clientId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
    await tracker.flush();

    expect(product.events.map((event) => event.name)).toEqual([
      'room_create',
      'seated',
      'room_join',
      'seated',
    ]);
    expect(product.lobbies).toHaveLength(1);
    expect(product.lobbies[0]).toMatchObject({ source: 'hosted', peakSeats: 2 });
  });

  it('Should reject a wrong password but accept the right one', async () => {
    const { app } = await buildServer({
      flags: { ...DEFAULT_FLAGS, roomPassword: true },
    });
    const created = (await createRoom(app, { password: 'secret' })).body;

    const wrong = await httpJson(app, 'POST', `/api/rooms/${created.code}/join`, {
      name: 'Ben',
      password: 'nope',
    });
    expect(wrong.status).toBe(403);

    const right = await httpJson(app, 'POST', `/api/rooms/${created.code}/join`, {
      name: 'Ben',
      password: 'secret',
    });
    expect(right.status).toBe(200);
  });

  it('Should report an unknown room as not found', async () => {
    const { app } = await buildServer();
    const { status } = await httpJson(app, 'POST', '/api/rooms/NOPE99/join', {
      name: 'Ben',
    });
    expect(status).toBe(404);
  });

  it('Should turn players away once the room is full', async () => {
    // maxPlayers is clamped to at least minPlayers, so lower both.
    const { app } = await buildServer({ minPlayers: 3 });
    const created = (
      await createRoom(app, { options: { maxPlayers: 3 } })
    ).body;

    await httpJson(app, 'POST', `/api/rooms/${created.code}/join`, { name: 'Ben' });
    await httpJson(app, 'POST', `/api/rooms/${created.code}/join`, { name: 'Cal' });
    const full = await httpJson(app, 'POST', `/api/rooms/${created.code}/join`, {
      name: 'Dan',
    });
    expect(full.status).toBe(409);
  });

  it('Should rate-limit room creation per address', async () => {
    const { app } = await buildServer();
    for (let i = 0; i < 5; i++) {
      expect((await createRoom(app)).status).toBe(201);
    }
    const throttled = await createRoom(app);
    expect(throttled.status).toBe(429);
    expect((throttled.body as unknown as { code: string }).code).toBe('RATE_LIMITED');
  });

  it('Should seat create and join with the requested player card', async () => {
    const { app, repo } = await buildServer();
    const created = (await createRoom(app, { avatar: 4 })).body;
    expect(repo.resolve(created.code)?.room.players[0].avatar).toBe(4);

    await httpJson(app, 'POST', `/api/rooms/${created.code}/join`, {
      name: 'Ben',
      avatar: 12,
    });
    expect(repo.resolve(created.code)?.room.players[1].avatar).toBe(12);
  });
});

describe('room HTTP — previous Bale seat', () => {
  it('Should drop a reserved seat when the player joins a different room', async () => {
    const seats = new BaleSeatIndex();
    const { app, repo } = await buildServer({
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: BALE_TOKEN,
        botUsername: '@secret_hitler_bot',
        seats,
      },
    });

    const first = (await createRoom(app, { hostName: 'Ben' })).body;
    const seated = await httpJson<JoinRoomResponse>(
      app,
      'POST',
      `/api/rooms/${first.code}/join`,
      { name: 'Ana', initData: signInitData(9, 'Ana') },
    );
    expect(seated.status).toBe(200);
    expect(seats.get(9)?.roomId).toBe(first.roomId);

    const second = (await createRoom(app, { name: 'Other Table', hostName: 'Cal' })).body;
    const moved = await httpJson<JoinRoomResponse>(
      app,
      'POST',
      `/api/rooms/${second.code}/join`,
      { name: 'Ana', initData: signInitData(9, 'Ana') },
    );

    expect(moved.status).toBe(200);
    expect(moved.body.roomId).toBe(second.roomId);
    expect(moved.body.playerId).not.toBe(seated.body.playerId);
    expect(seats.get(9)?.roomId).toBe(second.roomId);
    expect(repo.get(first.roomId)?.room.findPlayer(seated.body.playerId)).toBeUndefined();
    expect(repo.get(second.roomId)?.room.findPlayer(moved.body.playerId)).toBeTruthy();
  });

  it('Should still rejoin the reserved room when that is the one they asked for', async () => {
    const seats = new BaleSeatIndex();
    const { app } = await buildServer({
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: BALE_TOKEN,
        botUsername: '@secret_hitler_bot',
        seats,
      },
    });

    const created = (await createRoom(app, { initData: signInitData(9, 'Ana') })).body;
    const again = await httpJson<JoinRoomResponse>(
      app,
      'POST',
      `/api/rooms/${created.code}/join`,
      { name: 'Ana', initData: signInitData(9, 'Ana') },
    );

    expect(again.status).toBe(200);
    expect(again.body.roomId).toBe(created.roomId);
    expect(again.body.playerId).toBe(created.playerId);
  });
});

describe('profile HTTP endpoints', () => {
  const clientId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  it('Should persist a chosen player card and return it', async () => {
    const { app } = await buildServer();
    const saved = await httpJson<{ avatar: number }>(app, 'PUT', '/api/profile', {
      avatar: 4,
      clientId,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.avatar).toBe(4);

    const loaded = await httpJson<{ avatar: number }>(
      app,
      'GET',
      `/api/profile?clientId=${clientId}`,
    );
    expect(loaded.status).toBe(200);
    expect(loaded.body.avatar).toBe(4);
  });

  it('Should overwrite a previously saved player card', async () => {
    const { app } = await buildServer();
    await httpJson(app, 'PUT', '/api/profile', { avatar: 1, clientId });
    const saved = await httpJson<{ avatar: number }>(app, 'PUT', '/api/profile', {
      avatar: 9,
      clientId,
    });
    expect(saved.body.avatar).toBe(9);
  });

  it('Should reject a save without a client id', async () => {
    const { app } = await buildServer();
    const { status } = await httpJson(app, 'PUT', '/api/profile', { avatar: 1 });
    expect(status).toBe(400);
  });

  it('Should report an unknown profile as not found', async () => {
    const { app } = await buildServer();
    const { status } = await httpJson(
      app,
      'GET',
      `/api/profile?clientId=${clientId}`,
    );
    expect(status).toBe(404);
  });
});

describe('GET /api/flags', () => {
  it('Should return catalog defaults when no flags are injected', async () => {
    const { app } = await buildServer();
    const { status, body } = await httpJson<FlagsResponse>(app, 'GET', '/api/flags');
    expect(status).toBe(200);
    expect(body).toEqual({ flags: DEFAULT_FLAGS });
  });

  it('Should return injected flags as-is', async () => {
    const { app } = await buildServer({ flags: { ...DEFAULT_FLAGS, voice: true } });
    const { status, body } = await httpJson<FlagsResponse>(app, 'GET', '/api/flags');
    expect(status).toBe(200);
    expect(body).toEqual({ flags: { ...DEFAULT_FLAGS, voice: true } });
  });

  it('Should tell browsers not to cache the flag catalog', async () => {
    const { app } = await buildServer({ flags: { ...DEFAULT_FLAGS, voice: true } });
    const response = await app.inject({ method: 'GET', url: '/api/flags' });
    expect(response.headers['cache-control']).toBe('no-store');
  });
});

describe('room HTTP — Telegram + Bale together', () => {
  const TELEGRAM_TOKEN = '999:telegram-token';

  function signTelegram(userId: number, firstName: string): string {
    const fields = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: userId, first_name: firstName }),
    };
    const params = new URLSearchParams(fields);
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(TELEGRAM_TOKEN).digest();
    const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    params.set('hash', hash);
    return params.toString();
  }

  it('Should copy a t.me invite when the creator signed in through Telegram', async () => {
    const seats = new BaleSeatIndex();
    const { app } = await buildServer({
      telegram: {
        kind: 'telegram',
        bot: { sendMessage: async () => ({}) },
        botToken: TELEGRAM_TOKEN,
        botUsername: '@secret_hitler_bot',
        webAppShortName: 'game',
        seats,
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/rooms',
      headers: { host: 'mrfantastic.ir' },
      payload: {
        name: 'Friday Night',
        hostName: 'Ana',
        initData: signTelegram(9, 'Ana'),
      },
    });
    const body = response.json() as CreateRoomResponse;
    expect(response.statusCode).toBe(201);
    expect(body.shareLink).toBe(
      `https://t.me/secret_hitler_bot/game?startapp=${body.code}`,
    );
    expect(seats.get(9, 'telegram')?.playerId).toBe(body.playerId);
    expect(seats.get(9)).toBeUndefined();
  });

  it('Should seat a Bale user and a Telegram user with the same numeric id at one table', async () => {
    const seats = new BaleSeatIndex();
    const { app, repo } = await buildServer({
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: BALE_TOKEN,
        botUsername: '@secret_hitler_bot',
        seats,
      },
      telegram: {
        kind: 'telegram',
        bot: { sendMessage: async () => ({}) },
        botToken: TELEGRAM_TOKEN,
        botUsername: '@secret_hitler_bot',
        webAppShortName: 'game',
        seats,
      },
    });
    const created = (await createRoom(app, { initData: signInitData(9, 'Ana') })).body;
    const joined = await httpJson<JoinRoomResponse>(
      app,
      'POST',
      `/api/rooms/${created.code}/join`,
      { name: 'Cal', initData: signTelegram(9, 'Cal') },
    );
    expect(joined.status).toBe(200);
    expect(joined.body.playerId).not.toBe(created.playerId);
    expect(repo.resolve(created.code)?.room.players).toHaveLength(2);
    expect(seats.get(9)?.playerId).toBe(created.playerId);
    expect(seats.get(9, 'telegram')?.playerId).toBe(joined.body.playerId);
  });
});

describe('play-game HTTP', () => {
  it('Should seat the admin on two different players from the same table', async () => {
    const { app, repo } = await buildServer({
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: BALE_TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const first = await httpJson<JoinRoomResponse>(app, 'POST', '/api/play-game', {
      seat: 1,
      initData: signInitData(1_902_004_260, 'Admin'),
    });
    const second = await httpJson<JoinRoomResponse>(app, 'POST', '/api/play-game', {
      seat: 2,
      initData: signInitData(1_902_004_260, 'Admin'),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.playerId).not.toBe(second.body.playerId);
    expect(first.body.roomId).toBe(second.body.roomId);
    expect(repo.get(first.body.roomId)?.room.phase).not.toBe('lobby');
    expect(repo.listPublic()).toEqual([]);
  });

  it('Should refuse play-game for a non-admin mini-app user', async () => {
    const { app } = await buildServer({
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: BALE_TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const refused = await httpJson(app, 'POST', '/api/play-game', {
      seat: 1,
      initData: signInitData(9, 'Ana'),
    });
    expect(refused.status).toBe(403);
  });

  it('Should open a test table without initData when allowDevPlay is on', async () => {
    const { app, repo } = await buildServer({ allowDevPlay: true });
    const seated = await httpJson<JoinRoomResponse>(app, 'POST', '/api/play-game', {
      seat: 1,
    });
    expect(seated.status).toBe(200);
    expect(seated.body.playerId).toBeTruthy();
    expect(repo.get(seated.body.roomId)?.room.phase).not.toBe('lobby');
    expect(repo.listPublic()).toEqual([]);
  });

  it('Should refuse unauthenticated play-game when allowDevPlay is off', async () => {
    const { app } = await buildServer({ allowDevPlay: false });
    const refused = await httpJson(app, 'POST', '/api/play-game', { seat: 1 });
    expect(refused.status).toBe(401);
  });
});
