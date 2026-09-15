import { describe, expect, it } from '@rstest/core';
import { parsePlayGameStartApp, playGameStartApp } from './playGameStartApp';

describe('playGameStartApp', () => {
  it('Should encode seat and room code as a startapp payload', () => {
    expect(playGameStartApp('abc123', 2)).toBe('p2ABC123');
  });

  it('Should parse a startapp payload back into seat and code', () => {
    expect(parsePlayGameStartApp('p1L2YYP4')).toEqual({ code: 'L2YYP4', seat: 1 });
  });

  it('Should ignore a plain room code', () => {
    expect(parsePlayGameStartApp('ABC123')).toBeNull();
  });
});
