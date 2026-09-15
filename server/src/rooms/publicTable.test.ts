import { afterEach, describe, expect, it } from '@rstest/core';
import { DEFAULT_FLAGS, Phase } from '@secret-hitler/shared';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';
import type { RoomSummary } from '@secret-hitler/shared';
import type { FastifyInstance } from 'fastify';

describe('public table', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (!app) return;
    await app.close();
    app = undefined;
  });

  it('Should not create a public lobby when the flag is off', async () => {
    const built = await buildServer();
    app = built.app;
    expect(built.repo.listPublic().filter((room) => room.kind === 'public')).toHaveLength(0);
  });

  it('Should pin an empty public lobby on the room list when the flag is on', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const publicRooms = built.repo.listPublic().filter((room) => room.kind === 'public');
    expect(publicRooms).toHaveLength(1);
    expect(publicRooms[0].playerCount).toBe(0);
    expect(publicRooms[0].phase).toBe(Phase.Lobby);

    const { body } = await httpJson<RoomSummary[]>(built.app, 'GET', '/api/rooms');
    expect(body[0]?.kind).toBe('public');
  });

  it('Should refuse a second public lobby while one is still waiting', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    built.sockets.ensurePublicLobby();
    expect(built.repo.listPublic().filter((room) => room.kind === 'public')).toHaveLength(1);
  });

  it('Should keep an empty public lobby after the last sitter leaves', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const lobby = built.repo.listPublic().find((room) => room.kind === 'public');
    expect(lobby).toBeTruthy();
    const entry = built.repo.get(lobby!.id)!;
    const seated = entry.engine.addPlayer('Ana');
    expect('id' in seated).toBe(true);
    if (!('id' in seated)) return;
    entry.engine.removePlayer(seated.id);
    expect(built.repo.get(lobby!.id)).toBeTruthy();
    expect(built.repo.listPublic().filter((room) => room.kind === 'public')).toHaveLength(1);
  });

  it('Should spawn a fresh public lobby when the waiting one starts', async () => {
    const built = await buildServer({
      minPlayers: 3,
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const waiting = built.repo.listPublic().find((room) => room.kind === 'public');
    expect(waiting).toBeTruthy();
    const entry = built.repo.get(waiting!.id)!;
    const ids: string[] = [];
    for (const name of ['Ana', 'Ben', 'Cal']) {
      const player = entry.engine.addPlayer(name);
      expect('id' in player).toBe(true);
      if ('id' in player) ids.push(player.id);
    }
    for (const id of ids) entry.engine.setReady(id, true);
    for (const id of ids) expect(entry.engine.setWantStart(id, true)).toBeNull();
    expect(entry.room.phase).toBe(Phase.Nomination);
    const publicLobbies = built.repo.listPublic().filter((room) => room.kind === 'public');
    expect(publicLobbies).toHaveLength(1);
    expect(publicLobbies[0].id).not.toBe(waiting.id);
    expect(publicLobbies[0].playerCount).toBe(0);
  });

  it('Should refuse join when that sit identity is banned from the table', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const lobby = built.repo.listPublic().find((room) => room.kind === 'public');
    expect(lobby).toBeTruthy();
    const clientId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    built.repo.get(lobby!.id)!.room.bannedJoinKeys.add(`client:${clientId}`);

    const joined = await httpJson(built.app, 'POST', `/api/rooms/${lobby!.code}/join`, {
      name: 'Ben',
      clientId,
    });
    expect(joined.status).toBe(403);
    expect((joined.body as { code?: string }).code).toBe('BANNED');
  });

  it('Should recreate the public lobby when listing rooms if it is missing', async () => {
    const built = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
    });
    app = built.app;
    const lobby = built.repo.listPublic().find((room) => room.kind === 'public');
    expect(lobby).toBeTruthy();
    built.repo.remove(lobby!.id);

    const { body } = await httpJson<RoomSummary[]>(built.app, 'GET', '/api/rooms');
    expect(body.some((room) => room.kind === 'public')).toBe(true);
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
});
