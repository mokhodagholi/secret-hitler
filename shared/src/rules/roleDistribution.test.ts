import { describe, expect, it } from '@rstest/core';
import { buildRoleBag } from './roleDistribution';

describe('buildRoleBag', () => {
  it('Should always contain exactly one Hitler', () => {
    for (let count = 5; count <= 10; count++) {
      const bag = buildRoleBag(count);
      expect(bag.filter((role) => role === 'hitler')).toHaveLength(1);
      expect(bag).toHaveLength(count);
    }
  });

  it('Should use the standard fascist counts for 5-10 players', () => {
    const expected: Record<number, number> = { 5: 1, 6: 1, 7: 2, 8: 2, 9: 3, 10: 3 };
    for (const [players, fascists] of Object.entries(expected)) {
      const bag = buildRoleBag(Number(players));
      expect(bag.filter((role) => role === 'fascist')).toHaveLength(fascists);
    }
  });

  it('Should support the 3-player dev floor', () => {
    const bag = buildRoleBag(3);
    expect(bag.sort()).toEqual(['fascist', 'hitler', 'liberal']);
  });

  it('Should throw for unsupported player counts', () => {
    expect(() => buildRoleBag(2)).toThrow();
    expect(() => buildRoleBag(11)).toThrow();
  });
});
