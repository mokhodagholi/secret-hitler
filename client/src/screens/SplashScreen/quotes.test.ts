import { describe, expect, it } from '@rstest/core';
import { SPLASH_QUOTES } from './quotes';

describe('SPLASH_QUOTES', () => {
  it('Should hold about a hundred lines and skip the Vienna-years plaque', () => {
    expect(SPLASH_QUOTES.length).toBeGreaterThanOrEqual(90);
    expect(SPLASH_QUOTES.length).toBeLessThanOrEqual(110);
    for (const quote of SPLASH_QUOTES) {
      expect(quote.by?.fa).not.toBe('سال‌های وین');
      expect(quote.by?.en).not.toBe('on the Vienna years');
    }
  });
});
