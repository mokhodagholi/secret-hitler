import { describe, expect, it } from '@rstest/core';
import { PUBLIC_TABLE_MAX_PLAYERS } from '../types/GameState';
import { RoomFactory } from './RoomFactory';

describe('RoomFactory', () => {
  it('Should cap a public table at six seats by default', () => {
    const room = RoomFactory.create({ name: 'میز عمومی', kind: 'public' });
    expect(room.options.maxPlayers).toBe(PUBLIC_TABLE_MAX_PLAYERS);
    expect(room.options.minPlayers).toBe(5);
  });

  it('Should still allow ten on a hosted table', () => {
    const room = RoomFactory.create({ name: 'Friday Night' });
    expect(room.options.maxPlayers).toBe(10);
  });
});
