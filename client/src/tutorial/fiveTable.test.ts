import { describe, expect, it } from '@rstest/core';
import { Phase } from '@secret-hitler/shared';
import { isAllowedChancellor, startFiveTable } from './fiveTable';

describe('fiveTable', () => {
  it('Should open nomination with forced Liberal you and Fascist Reza', () => {
    const table = startFiveTable({ name: 'You', avatar: 0 });
    expect(table.room.phase).toBe(Phase.Nomination);
    expect(table.room.discussionEndsAt).toBe(0);
    expect(table.room.findPlayer(table.youId)?.role).toBe('liberal');
    expect(table.room.findPlayer(table.rezaId)?.role).toBe('fascist');
    expect(table.room.findPlayer(table.omidId)?.role).toBe('hitler');
    expect(table.room.presidentId).toBe(table.youId);
  });

  it('Should only allow Nima or Sara as the first chancellor', () => {
    const table = startFiveTable({ name: 'You', avatar: 0 });
    expect(isAllowedChancellor(table, table.nimaId)).toBe(true);
    expect(isAllowedChancellor(table, table.saraId)).toBe(true);
    expect(isAllowedChancellor(table, table.rezaId)).toBe(false);
    expect(isAllowedChancellor(table, table.omidId)).toBe(false);
  });
});
