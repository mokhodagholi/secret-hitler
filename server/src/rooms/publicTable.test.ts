import { afterEach, describe, expect, it } from '@rstest/core';
import {
  DEFAULT_FLAGS,
  PUBLIC_TABLE_MAX_PLAYERS,
  type JoinRoomResponse,
  type MatchOccupancy,
  type RoomSummary,
} from '@secret-hitler/shared';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';
import { InMemoryProductStore } from '../product/InMemoryProductStore';
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

  it('Should list one empty Join salon when the flag is on', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const { body } = await httpJson<RoomSummary[]>(built.app, 'GET', '/api/rooms');
    expect(body.filter((room) => room.kind === 'public')).toHaveLength(1);
    expect(body[0]?.playerCount).toBe(0);
    expect(body[0]?.maxPlayers).toBe(PUBLIC_TABLE_MAX_PLAYERS);

    const occupancy = await httpJson<MatchOccupancy>(built.app, 'GET', '/api/match');
    expect(occupancy.body).toEqual({ waiting: 0, max: PUBLIC_TABLE_MAX_PLAYERS });
  });

  it('Should keep the empty salon and drop extra waiting publics', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const keep = built.repo.waitingPublicLobby();
    expect(keep).toBeTruthy();
    const extra = built.repo.create({ name: 'میز عمومی', kind: 'public' });
    built.sockets.ensurePublicLobby();
    expect(built.repo.get(keep!.room.id)).toBeTruthy();
    expect(built.repo.get(extra.room.id)).toBeUndefined();
  });

  it('Should cap a restored public lobby to ten seats', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const entry = built.repo.create({ name: 'میز عمومی', kind: 'public' });
    entry.engine.addPlayer('Ana');
    entry.room.options.maxPlayers = 8;
    built.sockets.ensurePublicLobby();
    expect(entry.room.options.maxPlayers).toBe(10);
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

  it('Should let a player sit the public salon by code', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    built.sockets.ensurePublicLobby();
    const salon = built.repo.waitingPublicLobby();
    expect(salon).toBeTruthy();
    const joined = await httpJson<JoinRoomResponse>(
      built.app,
      'POST',
      `/api/rooms/${salon!.room.code}/join`,
      { name: 'Ben' },
    );
    expect(joined.status).toBe(200);
    expect(joined.body.playerId).toBeTruthy();
    expect(salon!.room.hostId).toBe(joined.body.playerId);
  });

  it('Should record own-table interest without opening a room', async () => {
    const store = new InMemoryProductStore();
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
      product: store,
    });
    app = built.app;
    const prompt = await httpJson(built.app, 'POST', '/api/product/own-room', {
      intent: 'prompt',
      clientId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });
    const want = await httpJson(built.app, 'POST', '/api/product/own-room', {
      intent: 'want',
      clientId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });
    expect(prompt.status).toBe(200);
    expect(want.status).toBe(200);
    await built.product.flush();
    expect(store.events.map((event) => event.name)).toEqual([
      'own_room_prompt',
      'own_room_want',
    ]);
  });
});
