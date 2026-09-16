import { describe, expect, it } from '@rstest/core';
import { typeDelayMs } from './typewriter';

describe('typewriter delays', () => {
  it('Should start typing slow and speed up a little', () => {
    const first = typeDelayMs(0, 10);
    const last = typeDelayMs(9, 10);
    expect(first).toBeGreaterThan(last);
    expect(first).toBeGreaterThan(17);
    expect(last).toBeLessThan(17);
  });
});
