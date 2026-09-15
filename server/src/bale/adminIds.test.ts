import { describe, expect, it } from '@rstest/core';
import { DEFAULT_ADMIN_USER_ID, isAdminUser, parseAdminUserIds, parsePlayGameSeat } from './adminIds';

describe('admin play ids', () => {
  it('Should always allow the default Bale admin id', () => {
    const ids = parseAdminUserIds({});
    expect(isAdminUser(DEFAULT_ADMIN_USER_ID, ids)).toBe(true);
    expect(isAdminUser(9, ids)).toBe(false);
  });

  it('Should parse extra ids from ADMIN_USER_IDS', () => {
    const ids = parseAdminUserIds({ ADMIN_USER_IDS: '11, 22' });
    expect(isAdminUser(11, ids)).toBe(true);
    expect(isAdminUser(DEFAULT_ADMIN_USER_ID, ids)).toBe(true);
  });

  it('Should read a seat number from /play-game, defaulting to 1', () => {
    expect(parsePlayGameSeat('')).toBe(1);
    expect(parsePlayGameSeat('3')).toBe(3);
    expect(parsePlayGameSeat('9')).toBeNull();
  });
});
