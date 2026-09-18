import { describe, expect, it } from '@rstest/core';
import { Phase } from '@secret-hitler/shared';
import { isAllowedChancellor, startFiveTable } from './fiveTable';
import { startScriptedTable } from './scriptedTable';
import { portraitGender } from '../assets/avatars';

describe('fiveTable', () => {
  it('Should open nomination at night with forced Liberal you and Fascist Reza', () => {
    const table = startFiveTable({ name: 'You', avatar: 0 });
    expect(table.room.phase).toBe(Phase.Nomination);
    expect(table.room.discussionEndsAt).toBeGreaterThan(0);
    expect(table.room.findPlayer(table.youId)?.role).toBe('liberal');
    expect(table.room.findPlayer(table.rezaId)?.role).toBe('fascist');
    expect(table.room.findPlayer(table.omidId)?.role).toBe('hitler');
    expect(table.room.presidentId).toBe(table.youId);
  });

  it('Should only allow Nima as the first chancellor', () => {
    const table = startFiveTable({ name: 'You', avatar: 0 });
    expect(isAllowedChancellor(table, table.nimaId)).toBe(true);
    expect(isAllowedChancellor(table, table.saraId)).toBe(false);
    expect(isAllowedChancellor(table, table.rezaId)).toBe(false);
    expect(isAllowedChancellor(table, table.omidId)).toBe(false);
  });

  it('Should sit a man portrait on Nima and a woman portrait on Sara', () => {
    const table = startFiveTable({ name: 'You', avatar: 0 });
    expect(portraitGender(table.room.findPlayer(table.nimaId)?.avatar ?? -1)).toBe('man');
    expect(portraitGender(table.room.findPlayer(table.saraId)?.avatar ?? -1)).toBe(
      'woman',
    );
    expect(portraitGender(table.room.findPlayer(table.rezaId)?.avatar ?? -1)).toBe('man');
  });

  it('Should lock last chancellor at five after a government sits', () => {
    const table = startFiveTable({ name: 'You', avatar: 0 });
    table.strictFirstPick = false;
    table.room.lastElectedChancellorId = table.nimaId;
    expect(isAllowedChancellor(table, table.nimaId)).toBe(false);
    expect(isAllowedChancellor(table, table.saraId)).toBe(true);
    expect(isAllowedChancellor(table, table.rezaId)).toBe(true);
  });
});

describe('scriptedTable — later counts', () => {
  it('Should seat six with an extra Liberal and last-chancellor ineligible', () => {
    const table = startScriptedTable({ name: 'You', avatar: 0 }, 6);
    expect(table.room.players).toHaveLength(6);
    expect(table.room.phase).toBe(Phase.Nomination);
    expect(table.room.discussionEndsAt).toBe(0);
    expect(table.room.findPlayer(table.seatIds[5])?.role).toBe('liberal');
    expect(table.room.findPlayer(table.nimaId)?.name).toBe('Nima');
    expect(isAllowedChancellor(table, table.nimaId)).toBe(false);
    expect(isAllowedChancellor(table, table.saraId)).toBe(true);
  });

  it('Should seat seven with a second Fascist and skip night', () => {
    const table = startScriptedTable({ name: 'You', avatar: 0 }, 7);
    expect(table.room.players).toHaveLength(7);
    expect(table.room.discussionEndsAt).toBe(0);
    expect(table.room.findPlayer(table.seatIds[6])?.role).toBe('fascist');
    expect(table.room.findPlayer(table.omidId)?.role).toBe('hitler');
  });

  it('Should seat nine with two investigates on the large board mix', () => {
    const table = startScriptedTable({ name: 'You', avatar: 0 }, 9);
    expect(table.room.players).toHaveLength(9);
    expect(table.room.findPlayer(table.seatIds[8])?.role).toBe('fascist');
    const liberals = table.room.players.filter((player) => player.role === 'liberal');
    const fascists = table.room.players.filter((player) => player.role === 'fascist');
    expect(liberals).toHaveLength(5);
    expect(fascists).toHaveLength(3);
  });

  it('Should seat ten with six Liberals', () => {
    const table = startScriptedTable({ name: 'You', avatar: 0 }, 10);
    expect(table.room.players).toHaveLength(10);
    expect(table.room.findPlayer(table.seatIds[9])?.role).toBe('liberal');
    expect(table.room.players.filter((player) => player.role === 'liberal')).toHaveLength(6);
  });

  it('Should use localized companion names when provided', () => {
    const table = startScriptedTable(
      {
        name: 'You',
        avatar: 0,
        companions: ['نیما', 'سارا', 'رضا', 'امید', 'مریم'],
      },
      6,
    );
    expect(table.room.findPlayer(table.nimaId)?.name).toBe('نیما');
    expect(table.room.findPlayer(table.seatIds[5])?.name).toBe('مریم');
  });
});
