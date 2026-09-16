import { describe, expect, it } from '@rstest/core';
import { buildServer } from '../app';
import type { GameHistoryStore, SavedGame } from '../history/GameHistoryStore';
import { httpJson } from '../../test/test-utils';

const SAMPLE: SavedGame = {
  id: 'game-1',
  roomCode: 'ABC123',
  roomName: 'Friday Night',
  winner: 'fascist',
  playerCount: 5,
  liberalPolicies: 3,
  fascistPolicies: 6,
  endedAt: '2026-01-01T00:00:00.000Z',
  players: [{ name: 'Ana', role: 'hitler', seat: 0, won: true, joinKey: null }],
};

/** Read-only stub store returning a canned recent-games list. */
function stubHistory(recent: SavedGame[]): GameHistoryStore {
  return {
    saveGame: async () => {},
    listRecent: async (limit) => recent.slice(0, limit),
    satTogether: async () => false,
    close: async () => {},
  };
}

describe('history HTTP endpoint', () => {
  it('Should return an empty list before any games are recorded', async () => {
    const { app } = await buildServer();
    const { status, body } = await httpJson<SavedGame[]>(app, 'GET', '/api/history');

    expect(status).toBe(200);
    expect(body).toEqual([]);
  });

  it('Should return recent games from the configured store', async () => {
    const { app } = await buildServer({ history: stubHistory([SAMPLE]) });
    const { status, body } = await httpJson<SavedGame[]>(app, 'GET', '/api/history');

    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ roomCode: 'ABC123', winner: 'fascist' });
  });

  it('Should pass a limit query through to the store', async () => {
    const many = Array.from({ length: 5 }, (_unused, index) => ({
      ...SAMPLE,
      id: `game-${index}`,
    }));
    const { app } = await buildServer({ history: stubHistory(many) });
    const { body } = await httpJson<SavedGame[]>(app, 'GET', '/api/history?limit=2');

    expect(body).toHaveLength(2);
  });
});
