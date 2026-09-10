import { describe, expect, it } from '@rstest/core';
import { AVATAR_COUNT, normalizeAvatar } from './avatars';

describe('normalizeAvatar', () => {
  it('Should wrap an index onto the shipped portrait set', () => {
    expect(normalizeAvatar(0)).toBe(0);
    expect(normalizeAvatar(AVATAR_COUNT)).toBe(0);
    expect(normalizeAvatar(4)).toBe(4);
    expect(normalizeAvatar(-1)).toBe(AVATAR_COUNT - 1);
    expect(normalizeAvatar('3')).toBe(0);
  });
});
