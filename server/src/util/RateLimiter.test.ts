import { describe, expect, it } from '@rstest/core';
import { RateLimiter } from './RateLimiter';

/** Manually advanced clock so window expiry is deterministic. */
function makeClock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => (now += ms),
  };
}

describe('RateLimiter', () => {
  it('Should allow events up to the limit inside one window', () => {
    const clock = makeClock();
    const limiter = new RateLimiter(3, 1000, clock.now);
    expect(limiter.allow('ana')).toBe(true);
    expect(limiter.allow('ana')).toBe(true);
    expect(limiter.allow('ana')).toBe(true);
    expect(limiter.allow('ana')).toBe(false);
  });

  it('Should track each key independently', () => {
    const limiter = new RateLimiter(1, 1000, makeClock().now);
    expect(limiter.allow('ana')).toBe(true);
    expect(limiter.allow('ben')).toBe(true);
    expect(limiter.allow('ana')).toBe(false);
  });

  it('Should free budget again once the window slides past old events', () => {
    const clock = makeClock();
    const limiter = new RateLimiter(2, 1000, clock.now);
    limiter.allow('ana');
    limiter.allow('ana');
    expect(limiter.allow('ana')).toBe(false);

    clock.advance(1001);
    expect(limiter.allow('ana')).toBe(true);
  });

  it('Should forget a cleared key entirely', () => {
    const limiter = new RateLimiter(1, 1000, makeClock().now);
    limiter.allow('ana');
    limiter.clear('ana');
    expect(limiter.allow('ana')).toBe(true);
  });
});
