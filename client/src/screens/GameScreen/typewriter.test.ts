import { describe, expect, it } from '@rstest/core';
import { deleteDelayMs, typeDelayMs } from './typewriter';

describe('typewriter delays', () => {
  it('Should start typing slow and speed up a little', () => {
    const first = typeDelayMs(0, 10);
    const last = typeDelayMs(9, 10);
    expect(first).toBeGreaterThan(last);
    expect(first).toBeGreaterThan(50);
    expect(last).toBeLessThan(50);
  });

  it('Should start deleting fast and slow down at the end', () => {
    const first = deleteDelayMs(9, 10);
    const last = deleteDelayMs(0, 10);
    expect(last).toBeGreaterThan(first);
    expect(first).toBeLessThan(20);
    expect(last).toBeGreaterThan(40);
  });
});
