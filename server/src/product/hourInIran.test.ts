import { describe, expect, it } from '@rstest/core';
import { hourInIran } from './hourInIran';

describe('hourInIran', () => {
  it('Should return 0–23 for a UTC instant', () => {
    const hour = hourInIran(new Date('2026-09-16T12:00:00.000Z'));
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThan(24);
  });

  it('Should be three and a half hours ahead of UTC on a winter date', () => {
    // Iran is UTC+3:30 without DST.
    expect(hourInIran(new Date('2026-01-15T12:00:00.000Z'))).toBe(15);
  });
});
