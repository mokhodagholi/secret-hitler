import { afterEach, describe, expect, it } from '@rstest/core';
import {
  DEFAULT_FLAGS,
  Phase,
  PUBLIC_TABLE_MAX_PLAYERS,
  type MatchOccupancy,
  type MatchQueueResponse,
  type RoomSummary,
} from '@secret-hitler/shared';
import { buildServer } from '../app';
import { httpJson, listenServer, TestClient } from '../../test/test-utils';
import type { FastifyInstance } from 'fastify';

describe('public table', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (!app) return;
    await app.close();
    app = undefined;
  });

  it('Should not create a public lobby when the flag is off', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: false },
    });
    app = built.app;
    expect(built.repo.listPublic().filter((room) => room.kind === 'public')).toHaveLength(0);
    const occupancy = await httpJson<MatchOccupancy>(built.app, 'GET', '/api/match');
    expect(occupancy.body.waiting).toBe(0);
    const queued = await httpJson(built.app, 'POST', '/api/match/queue', { name: 'Ana' });
    expect(queued.status).toBe(404);
  });

  it('Should keep Find Match as a queue instead of an empty Join lobby', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    expect(built.repo.listPublic().filter((room) => room.kind === 'public')).toHaveLength(0);

    const { body } = await httpJson<RoomSummary[]>(built.app, 'GET', '/api/rooms');
    expect(body.some((room) => room.kind === 'public')).toBe(false);

    const occupancy = await httpJson<MatchOccupancy>(built.app, 'GET', '/api/match');
    expect(occupancy.body).toEqual({ waiting: 0, max: PUBLIC_TABLE_MAX_PLAYERS });
  });

  it('Should drop empty leftover public lobbies', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const leftover = built.repo.create({ name: 'میز عمومی', kind: 'public' });
    const leftoverId = leftover.room.id;
    built.sockets.ensurePublicLobby();
    expect(built.repo.get(leftoverId)).toBeUndefined();
  });

  it('Should cap a restored public lobby to six seats', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const entry = built.repo.create({ name: 'میز عمومی', kind: 'public' });
    entry.engine.addPlayer('Ana');
    entry.room.options.maxPlayers = 10;
    built.sockets.ensurePublicLobby();
    expect(entry.room.options.maxPlayers).toBe(6);
  });

  it('Should hide admin play tables from the public and /games lists', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    built.repo.create({ name: 'میز آزمایش', adminPlayUserId: 1_902_004_260 });

    expect(built.repo.listPublic().some((room) => room.name === 'میز آزمایش')).toBe(false);
    expect(built.repo.listAll().some((room) => room.name === 'میز آزمایش')).toBe(false);
    expect(built.repo.findAdminPlay(1_902_004_260)).toBeTruthy();
  });

  it('Should destroy an admin play table when a seat leaves', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const entry = built.repo.create({
      name: 'میز آزمایش',
      adminPlayUserId: 1_902_004_260,
    });
    built.sockets.registerEngine(entry);
    const seated = entry.engine.addPlayer('بازیکن ۱');
    expect('id' in seated).toBe(true);
    if (!('id' in seated)) return;
    entry.engine.addPlayer('بازیکن ۲');
    built.sockets.dropSeat(entry, seated.id);
    expect(built.repo.findAdminPlay(1_902_004_260)).toBeUndefined();
    expect(built.repo.get(entry.room.id)).toBeUndefined();
  });

  it('Should refuse joining a reserved public table by code', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const entry = built.repo.create({ name: 'میز عمومی', kind: 'public' });
    const joined = await httpJson(built.app, 'POST', `/api/rooms/${entry.room.code}/join`, {
      name: 'Ben',
    });
    expect(joined.status).toBe(403);
    expect((joined.body as { code?: string }).code).toBe('INVALID_ACTION');
  });
});

describe('Find Match queue', () => {
  it('Should seat six connected waiters in a reserved room and leave leftovers queued', async () => {
    const live = await listenServer(3, { flags: { ...DEFAULT_FLAGS, publicTable: true } });
    const names = ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay', 'Gus'];
    const clients: TestClient[] = [];
    try {
      for (const name of names) {
        const queued = await httpJson<MatchQueueResponse>(
          live.app,
          'POST',
          '/api/match/queue',
          { name, clientId: `${name.toLowerCase()}aaa-bbbb-cccc-dddd-eeeeeeeeeeee`.slice(0, 36) },
        );
        expect(queued.status).toBe(200);
        const client = await TestClient.connect(live.port);
        await client.auth(queued.body.token);
        clients.push(client);
      }

      const found = await clients[0].waitFor('match:found');
      for (const client of clients.slice(1, 6)) {
        await client.waitFor('match:found');
      }

      const occupancy = await httpJson<MatchOccupancy>(live.app, 'GET', '/api/match');
      expect(occupancy.body.waiting).toBe(1);

      const reserved = live.repo.get(found.roomId);
      expect(reserved).toBeTruthy();
      expect(reserved!.room.players).toHaveLength(6);
      expect(reserved!.room.startChoice).not.toBeNull();

      const leaver = reserved!.room.players[0];
      live.sockets.dropSeat(reserved!, leaver.id);

      const backfill = await clients[6].waitFor('match:found');
      expect(backfill.playerId).toBeTruthy();
      expect(reserved!.room.players).toHaveLength(6);
      expect(
        reserved!.room.players.some((player) => player.id === backfill.playerId),
      ).toBe(true);

      const after = await httpJson<MatchOccupancy>(live.app, 'GET', '/api/match');
      expect(after.body.waiting).toBe(0);
    } finally {
      for (const client of clients) client.close();
      await live.close();
    }
  });
});
