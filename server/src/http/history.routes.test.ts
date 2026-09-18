import { describe, expect, it } from '@rstest/core';
import type { HistoryMatchView } from '@secret-hitler/shared';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';
import { InMemoryGameHistoryStore } from '../history/InMemoryGameHistoryStore';

const ANA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BEN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('history HTTP endpoint', () => {
  it('Should not publish a public list of finished games', async () => {
    const { app } = await buildServer();
    const { status } = await httpJson(app, 'GET', '/api/history');

    expect(status).toBe(404);
  });

  it('Should list only the caller’s finished tables and hide their own account', async () => {
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
    await history.saveGame({
      roomCode: 'ZZZZZZ',
      roomName: 'Other table',
      winner: 'fascist',
      playerCount: 3,
      liberalPolicies: 0,
      fascistPolicies: 6,
      players: [
        { name: 'Ben', role: 'hitler', seat: 0, won: true, joinKey: `client:${BEN}` },
        { name: 'Cal', role: 'fascist', seat: 1, won: true, joinKey: null },
        { name: 'Dot', role: 'liberal', seat: 2, won: false, joinKey: 'client:dot' },
      ],
    });
    const { app } = await buildServer({ history });

    const denied = await httpJson<{ code?: string }>(app, 'POST', '/api/history/mine', {});
    expect(denied.status).toBe(400);
    expect(denied.body.code).toBe('AUTH_FAILED');

    const { status, body } = await httpJson<HistoryMatchView[]>(app, 'POST', '/api/history/mine', {
      clientId: ANA,
    });
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].youWon).toBe(true);
    expect(body[0].winner).toBe('liberal');
    const ana = body[0].players.find((player) => player.you);
    const ben = body[0].players.find((player) => player.name === 'Ben');
    const cal = body[0].players.find((player) => player.name === 'Cal');
    expect(ana?.accountId).toBeNull();
    expect(ben?.accountId).toBe(`client:${BEN}`);
    expect(cal?.accountId).toBeNull();
  });
});
