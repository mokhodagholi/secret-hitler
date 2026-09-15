import { describe, expect, it } from '@rstest/core';
import { GameEngine } from './GameEngine';
import { RoomFactory } from '../factories/RoomFactory';
import { Phase } from '../types/GameState';

describe('GameEngine — admin play', () => {
  it('Should deal without a ready check on an admin play table', () => {
    const room = RoomFactory.create({
      name: 'میز آزمایش',
      minPlayers: 5,
      adminPlayUserId: 1_902_004_260,
    });
    const engine = new GameEngine(room);
    for (const name of ['Ana', 'Ben', 'Cal', 'Dia', 'Eli']) {
      engine.addPlayer(name, room.players.length === 0);
    }
    expect(engine.startGame(room.hostId)).toBeNull();
    expect(room.phase).toBe(Phase.Nomination);
  });
});
