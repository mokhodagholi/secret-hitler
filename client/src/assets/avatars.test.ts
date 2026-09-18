import { describe, expect, it } from '@rstest/core';
import { AVATAR_COUNT } from '@secret-hitler/shared';
import { PORTRAITS, assignPortraits, portraitGender } from './avatars';

describe('PORTRAITS', () => {
  it('Should ship one illustrated card per avatar index', () => {
    expect(PORTRAITS).toHaveLength(AVATAR_COUNT);
  });

  it('Should assign man portraits to men and woman portraits to women', () => {
    const seats = assignPortraits(0, ['man', 'woman', 'man', 'man']);
    expect(seats).toHaveLength(4);
    expect(new Set(seats).size).toBe(4);
    expect(seats.includes(0)).toBe(false);
    expect(portraitGender(seats[0]!)).toBe('man');
    expect(portraitGender(seats[1]!)).toBe('woman');
    expect(portraitGender(seats[2]!)).toBe('man');
    expect(portraitGender(seats[3]!)).toBe('man');
  });
});
