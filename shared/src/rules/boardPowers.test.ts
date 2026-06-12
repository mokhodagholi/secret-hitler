import { describe, expect, it } from '@rstest/core';
import { powerForFascistPolicy } from './boardPowers';

describe('boardPowers', () => {
  it('Should grant Policy Peek then Execution in 5–6 player games', () => {
    expect(powerForFascistPolicy(5, 1)).toBeNull();
    expect(powerForFascistPolicy(6, 2)).toBeNull();
    expect(powerForFascistPolicy(5, 3)).toBe('policyPeek');
    expect(powerForFascistPolicy(6, 4)).toBe('execution');
    expect(powerForFascistPolicy(5, 5)).toBe('execution');
  });

  it('Should grant Investigate then Special Election in 7–8 player games', () => {
    expect(powerForFascistPolicy(7, 1)).toBeNull();
    expect(powerForFascistPolicy(8, 2)).toBe('investigate');
    expect(powerForFascistPolicy(7, 3)).toBe('specialElection');
    expect(powerForFascistPolicy(8, 4)).toBe('execution');
  });

  it('Should grant two Investigates in 9–10 player games', () => {
    expect(powerForFascistPolicy(9, 1)).toBe('investigate');
    expect(powerForFascistPolicy(10, 2)).toBe('investigate');
    expect(powerForFascistPolicy(9, 3)).toBe('specialElection');
    expect(powerForFascistPolicy(10, 5)).toBe('execution');
  });

  it('Should grant no power for the 6th fascist policy or out-of-range', () => {
    expect(powerForFascistPolicy(9, 6)).toBeNull();
    expect(powerForFascistPolicy(5, 0)).toBeNull();
  });
});
