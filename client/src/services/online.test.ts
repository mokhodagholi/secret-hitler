import { describe, expect, it } from '@rstest/core';
import { waitForOnline } from './online';

describe('waitForOnline', () => {
  it('Should return as soon as a probe succeeds', async () => {
    let n = 0;
    const ok = await waitForOnline({
      probe: async () => ++n === 2,
      sleep: async () => undefined,
    });
    expect(ok).toBe(true);
    expect(n).toBe(2);
  });

  it('Should keep trying for five seconds, then report offline', async () => {
    let now = 0;
    let probes = 0;
    const ok = await waitForOnline({
      timeoutMs: 5_000,
      now: () => now,
      probe: async () => {
        probes += 1;
        now += 200;
        return false;
      },
      sleep: async (ms) => {
        now += ms;
      },
    });
    expect(ok).toBe(false);
    expect(probes).toBeGreaterThan(1);
    expect(now).toBeGreaterThanOrEqual(5_000);
  });
});
