import { describe, expect, it } from '@rstest/core';
import {
  DEFAULT_FLAGS,
  Phase,
  type CreateRoomResponse,
} from '@secret-hitler/shared';
import { buildServer, type BuiltServer } from '../app';
import { httpJson, listenServer, TestClient } from '../../test/test-utils';
import { InMemoryLiveRoomStore } from './InMemoryLiveRoomStore';

function waitUntil(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('Timed out waiting for room teardown'));
        return;
      }
      setTimeout(tick, 10);
    };
    tick();
  });
}

async function dealHostedTable(built: BuiltServer, roomId: string): Promise<void> {
  const entry = built.repo.get(roomId);
  expect(entry).toBeTruthy();
  if (!entry) return;
  for (const name of ['Ben', 'Cal']) {
    const seated = entry.engine.addPlayer(name);
    expect('id' in seated).toBe(true);
  }
  for (const player of entry.room.players) {
    if (!player.isHost) entry.engine.setReady(player.id, true);
  }
  expect(entry.engine.startGame(entry.room.hostId)).toBeNull();
  await built.sockets.persistRoom(roomId);
}

describe('live room persistence', () => {
  it('Should not restore a hosted lobby after a process restart', async () => {
    const live = new InMemoryLiveRoomStore();
    const first = await buildServer({ minPlayers: 3, live });
    const created = await httpJson<CreateRoomResponse>(first.app, 'POST', '/api/rooms', {
      name: 'Friday Night',
      hostName: 'Ana',
    });
    expect(created.status).toBe(201);
    await first.sockets.persistRoom(created.body.roomId);
    await first.app.close();

    const second = await buildServer({ minPlayers: 3, live });
    expect(second.repo.get(created.body.roomId)).toBeUndefined();
    expect(second.tokens.lookup(created.body.token)).toBeUndefined();
    await second.app.close();
  });

  it('Should drop a hosted lobby snapshotted under the old persist policy', async () => {
    const live = new InMemoryLiveRoomStore();
    const first = await buildServer({ minPlayers: 3, live });
    const created = await httpJson<CreateRoomResponse>(first.app, 'POST', '/api/rooms', {
      name: 'Friday Night',
      hostName: 'Ana',
    });
    const entry = first.repo.get(created.body.roomId)!;
    await first.sockets.persistRoom(created.body.roomId);
    await live.save(entry.room.id, entry.room.code, {
      room: entry.room.toSnapshot(),
      tokens: first.tokens.listForRoom(entry.room.id),
    });
    await first.app.close();

    const second = await buildServer({ minPlayers: 3, live });
    expect(second.repo.get(created.body.roomId)).toBeUndefined();
    expect(await live.loadAll()).toHaveLength(0);
    await second.app.close();
  });

  it('Should restore an in-progress match and let a player reconnect', async () => {
    const live = new InMemoryLiveRoomStore();
    const first = await listenServer(3, { live });
    const created = await httpJson<CreateRoomResponse>(first.app, 'POST', '/api/rooms', {
      name: 'Friday Night',
      hostName: 'Ana',
    });
    await dealHostedTable(first, created.body.roomId);
    await first.close();

    const second = await listenServer(3, { live });
    const room = second.repo.get(created.body.roomId)?.room;
    expect(room?.code).toBe(created.body.code);
    expect(room?.phase).not.toBe(Phase.Lobby);
    expect(room?.players).toHaveLength(3);
    expect(room?.players.every((player) => !player.connected)).toBe(true);

    const client = await TestClient.connect(second.port);
    const playerId = await client.auth(created.body.token);
    expect(playerId).toBe(created.body.playerId);
    expect(second.repo.get(created.body.roomId)?.room.players[0].connected).toBe(true);
    client.close();
    await second.close();
  });

  it('Should restore an empty public lobby after a process restart', async () => {
    const live = new InMemoryLiveRoomStore();
    const flags = { ...DEFAULT_FLAGS, publicTable: true };
    const first = await buildServer({ live, flags });
    const lobby = first.repo.listPublic().find((room) => room.kind === 'public');
    expect(lobby).toBeTruthy();
    await first.sockets.persistRoom(lobby!.id);
    await first.app.close();

    const second = await buildServer({ live, flags });
    const restored = second.repo.get(lobby!.id)?.room;
    expect(restored?.phase).toBe(Phase.Lobby);
    expect(second.repo.listPublic().filter((room) => room.kind === 'public')).toHaveLength(1);
    await second.app.close();
  });

  it('Should not restore a finished game after a process restart', async () => {
    const live = new InMemoryLiveRoomStore();
    const first = await buildServer({ minPlayers: 3, live });
    const created = await httpJson<CreateRoomResponse>(first.app, 'POST', '/api/rooms', {
      name: 'Friday Night',
      hostName: 'Ana',
    });
    await dealHostedTable(first, created.body.roomId);
    first.repo.get(created.body.roomId)!.engine.endGame('liberal');
    await first.sockets.persistRoom(created.body.roomId);
    await first.app.close();

    const second = await buildServer({ minPlayers: 3, live });
    expect(second.repo.get(created.body.roomId)).toBeUndefined();
    await second.app.close();
  });

  it('Should drop a destroyed room from the live store', async () => {
    const live = new InMemoryLiveRoomStore();
    const first = await listenServer(3, { live });
    const created = await httpJson<CreateRoomResponse>(first.app, 'POST', '/api/rooms', {
      name: 'Friday Night',
      hostName: 'Ana',
    });
    const client = await TestClient.connect(first.port);
    await client.auth(created.body.token);
    client.send({ type: 'room:leave' });
    await waitUntil(() => first.repo.get(created.body.roomId) == null);
    await first.sockets.persistRoom(created.body.roomId);
    await first.close();

    const second = await buildServer({ minPlayers: 3, live });
    expect(second.repo.get(created.body.roomId)).toBeUndefined();
    await second.app.close();
  });
});
