import { describe, expect, it } from '@rstest/core';
import type { CreateRoomResponse } from '@secret-hitler/shared';
import { buildServer } from '../app';
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

describe('live room persistence', () => {
  it('Should restore a lobby and its join token after a process restart', async () => {
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
    const room = second.repo.get(created.body.roomId)?.room;
    expect(room?.code).toBe(created.body.code);
    expect(room?.players).toHaveLength(1);
    expect(room?.players[0].connected).toBe(false);
    expect(second.tokens.lookup(created.body.token)?.playerId).toBe(created.body.playerId);
    await second.app.close();
  });

  it('Should let a player reconnect with the same token after a restart', async () => {
    const live = new InMemoryLiveRoomStore();
    const first = await listenServer(3, { live });
    const created = await httpJson<CreateRoomResponse>(first.app, 'POST', '/api/rooms', {
      name: 'Friday Night',
      hostName: 'Ana',
    });
    await first.sockets.persistRoom(created.body.roomId);
    await first.close();

    const second = await listenServer(3, { live });
    const client = await TestClient.connect(second.port);
    const playerId = await client.auth(created.body.token);
    expect(playerId).toBe(created.body.playerId);
    expect(second.repo.get(created.body.roomId)?.room.players[0].connected).toBe(true);
    client.close();
    await second.close();
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
