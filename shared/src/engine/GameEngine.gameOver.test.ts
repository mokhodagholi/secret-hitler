import { describe, expect, it } from '@rstest/core';
import { Phase } from '../types/GameState';
import { startGame } from '../../test/test-utils';

describe('GameEngine — game over continue', () => {
  it('Should refuse continue before the game has ended', () => {
    const { engine, players } = startGame();
    expect(engine.continuePlaying(players[0].id)).toMatchObject({
      code: 'INVALID_ACTION',
    });
  });

  it('Should return the same room to lobby as soon as a player stays', () => {
    const { engine, room, players } = startGame();
    engine.endGame('fascist');
    expect(engine.continuePlaying(players[0].id)).toBeNull();
    expect(room.phase).toBe(Phase.Lobby);
    expect(room.winner).toBeNull();
    expect(room.players).toHaveLength(3);
    expect(room.players.every((player) => player.role === null)).toBe(true);
    expect(room.players.every((player) => player.isAlive)).toBe(true);
    expect(room.players.every((player) => !player.wantsContinue)).toBe(true);
    expect(room.hostId).toBe(players[0].id);
    expect(players[0].ready).toBe(true);
    expect(players[1].ready).toBe(false);
  });

  it('Should drop disconnected seats when a player stays', () => {
    const { engine, room, players } = startGame();
    const [ana, ben] = players;
    engine.endGame('liberal');
    engine.setConnected(ben.id, false);
    expect(engine.continuePlaying(ana.id)).toBeNull();
    expect(room.phase).toBe(Phase.Lobby);
    expect(room.players.map((player) => player.name)).toEqual(['Ana', 'Cal']);
  });
});
