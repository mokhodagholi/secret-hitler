import { describe, expect, it } from '@rstest/core';
import { hashPassword, makeRoomPassword, verifyPassword } from './password';

describe('room password', () => {
  it('Should mint a four-character lock from the room-code alphabet', () => {
    const password = makeRoomPassword();
    expect(password).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
  });

  it('Should accept the original password and reject a wrong one', () => {
    const hash = hashPassword('K7P2');
    expect(verifyPassword('K7P2', hash)).toBe(true);
    expect(verifyPassword('nope', hash)).toBe(false);
    expect(verifyPassword('', hash)).toBe(false);
    expect(verifyPassword('', null)).toBe(true);
  });
});
