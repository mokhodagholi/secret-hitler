import { describe, expect, it } from '@rstest/core';
import { GameEngine, RoomFactory, type Role } from '@secret-hitler/shared';
import { GameResultRecorder } from './GameResultRecorder';
import type { GameHistoryStore, GameRecord, SavedGame } from './GameHistoryStore';

/** In-memory store that captures saved games, no Postgres needed. */
class FakeHistoryStore implements GameHistoryStore {
  readonly saved: GameRecord[] = [];

  async saveGame(record: GameRecord): Promise<void> {
    this.saved.push(record);
  }

  async listRecent(): Promise<SavedGame[]> {
    return this.saved.map((record, index) => ({
      ...record,
      id: String(index),
      endedAt: '2026-01-01T00:00:00.000Z',
    }));
  }

  async close(): Promise<void> {}
  async satTogether(): Promise<boolean> {
    return false;
  }
}

/** Seat players with fixed roles; returns the engine and room, game not yet over. */
function seatWithRoles(roles: Role[]) {
  const room = RoomFactory.create({ name: 'Friday Night', minPlayers: 3 });
  const engine = new GameEngine(room);
  roles.forEach((role, seat) => {
    const player = engine.addPlayer(`Player ${seat}`);
    if ('code' in player) throw new Error(player.code);
    room.findPlayer(player.id)!.role = role;
  });
  return { engine, room };
}

/** The recorder saves asynchronously; let its microtask flush. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('GameResultRecorder', () => {
  it('Should persist a finished game with its winner and board', async () => {
    const store = new FakeHistoryStore();
    const { engine, room } = seatWithRoles(['liberal', 'liberal', 'fascist', 'hitler']);
    room.liberalPolicies = 1;
    room.fascistPolicies = 6;
    new GameResultRecorder(store).attach({ engine, room });

    engine.endGame('fascist');
    await flush();

    expect(store.saved).toHaveLength(1);
    expect(store.saved[0]).toMatchObject({
      roomName: 'Friday Night',
      winner: 'fascist',
      playerCount: 4,
      fascistPolicies: 6,
      liberalPolicies: 1,
    });
    expect(store.saved[0].roomCode).toBe(room.code);
  });

  it('Should mark fascists and Hitler as winners when the Fascists win', async () => {
    const store = new FakeHistoryStore();
    const { engine, room } = seatWithRoles(['liberal', 'fascist', 'hitler']);
    new GameResultRecorder(store).attach({ engine, room });

    engine.endGame('fascist');
    await flush();

    const wonByRole = Object.fromEntries(
      store.saved[0].players.map((player) => [player.role, player.won]),
    );
    expect(wonByRole).toEqual({ liberal: false, fascist: true, hitler: true });
  });

  it('Should mark only liberals as winners when the Liberals win', async () => {
    const store = new FakeHistoryStore();
    const { engine, room } = seatWithRoles(['liberal', 'fascist', 'hitler']);
    new GameResultRecorder(store).attach({ engine, room });

    engine.endGame('liberal');
    await flush();

    const wonByRole = Object.fromEntries(
      store.saved[0].players.map((player) => [player.role, player.won]),
    );
    expect(wonByRole).toEqual({ liberal: true, fascist: false, hitler: false });
  });

  it('Should skip seats that were never dealt a role', async () => {
    const store = new FakeHistoryStore();
    const room = RoomFactory.create({ name: 'Test', minPlayers: 3 });
    const engine = new GameEngine(room);
    engine.addPlayer('Roleless');
    new GameResultRecorder(store).attach({ engine, room });

    engine.endGame('liberal');
    await flush();

    expect(store.saved[0].players).toHaveLength(0);
    expect(store.saved[0].playerCount).toBe(1);
  });

  it('Should not crash a game when the store throws', async () => {
    const store: GameHistoryStore = {
      saveGame: () => Promise.reject(new Error('db down')),
      listRecent: async () => [],
      satTogether: async () => false,
      close: async () => {},
    };
    const { engine, room } = seatWithRoles(['liberal', 'fascist', 'hitler']);
    new GameResultRecorder(store).attach({ engine, room });

    expect(() => engine.endGame('liberal')).not.toThrow();
    await flush();
  });
});
