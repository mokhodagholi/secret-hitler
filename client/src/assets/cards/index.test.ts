import { describe, expect, it } from '@rstest/core';
import { ROLE_FACES, roleFace } from './index';

describe('roleFace', () => {
  it('Should ship three portraits for each role', () => {
    expect(ROLE_FACES.liberal).toHaveLength(3);
    expect(ROLE_FACES.fascist).toHaveLength(3);
    expect(ROLE_FACES.hitler).toHaveLength(3);
    expect(new Set(ROLE_FACES.liberal).size).toBe(3);
    expect(new Set(ROLE_FACES.fascist).size).toBe(3);
    expect(new Set(ROLE_FACES.hitler).size).toBe(3);
  });

  it('Should keep the same portrait for the same player', () => {
    const face = roleFace('liberal', 'seat-3');
    expect(face).toBe(roleFace('liberal', 'seat-3'));
    expect(ROLE_FACES.liberal.includes(face)).toBe(true);
  });
});
