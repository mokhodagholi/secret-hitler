import { describe, expect, it } from '@rstest/core';
import { AVATAR_COUNT } from '@secret-hitler/shared';
import { PORTRAITS } from './avatars';

describe('PORTRAITS', () => {
  it('Should ship one illustrated card per avatar index', () => {
    expect(PORTRAITS).toHaveLength(AVATAR_COUNT);
  });
});
