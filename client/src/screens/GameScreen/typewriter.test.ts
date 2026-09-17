import { describe, expect, it } from '@rstest/core';
import { typeDelayMs } from './typewriter';

describe('typewriter delays', () => {
  it('Should pace typing to the spoken duration', () => {
    const total = 10;
    const durationMs = 2_000;
    let sum = 0;
    for (let index = 0; index < total - 1; index++) {
      sum += typeDelayMs(index, total, durationMs);
    }
    // Weighted ease still lands near the spoken window.
    expect(sum).toBeGreaterThan(durationMs * 0.85);
    expect(sum).toBeLessThan(durationMs * 1.25);
  });

  it('Should start a little slower than it finishes', () => {
    const first = typeDelayMs(0, 10, 2_000);
    const last = typeDelayMs(8, 10, 2_000);
    expect(first).toBeGreaterThan(last);
  });
});
