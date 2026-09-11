import { describe, expect, it } from '@rstest/core';
import type {
  CreateRoomResponse,
  FlagsResponse,
  JoinRoomResponse,
  RoomSummary,
} from '@secret-hitler/shared';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';

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

  it('Should reject a wrong password but accept the right one', async () => {
    const { app } = await buildServer();
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
    expect(body).toEqual({ flags: { voice: false } });
  });

  it('Should return injected flags as-is', async () => {
    const { app } = await buildServer({ flags: { voice: true } });
    const { status, body } = await httpJson<FlagsResponse>(app, 'GET', '/api/flags');
    expect(status).toBe(200);
    expect(body).toEqual({ flags: { voice: true } });
  });
});
