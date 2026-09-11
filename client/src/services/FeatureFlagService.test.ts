import { describe, expect, it } from '@rstest/core';
import { DEFAULT_FLAGS } from '@secret-hitler/shared';
import { FeatureFlagService } from './FeatureFlagService';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('FeatureFlagService', () => {
  it('Should start from catalog defaults', () => {
    const flags = new FeatureFlagService();
    expect(flags.enabled('voice')).toBe(false);
  });

  it('Should apply a successful /api/flags body', async () => {
    const flags = new FeatureFlagService(DEFAULT_FLAGS, async (url, init) => {
      expect(url).toBe('/api/flags');
      expect(init).toEqual({ cache: 'no-store' });
      return jsonResponse({ flags: { voice: true } });
    });
    await flags.load();
    expect(flags.enabled('voice')).toBe(true);
  });

  it('Should apply an incoming catalog without fetching', () => {
    const flags = new FeatureFlagService();
    flags.apply({ voice: true });
    expect(flags.enabled('voice')).toBe(true);
  });

  it('Should fetch /api/flags only once when load is called twice', async () => {
    let calls = 0;
    const flags = new FeatureFlagService(DEFAULT_FLAGS, async () => {
      calls += 1;
      return jsonResponse({ flags: { voice: true } });
    });
    await Promise.all([flags.load(), flags.load()]);
    expect(calls).toBe(1);
    expect(flags.enabled('voice')).toBe(true);
  });

  it('Should keep defaults when the request fails', async () => {
    const flags = new FeatureFlagService(DEFAULT_FLAGS, async () => {
      throw new Error('offline');
    });
    await flags.load();
    expect(flags.enabled('voice')).toBe(false);
  });

  it('Should keep defaults when the response is not ok or malformed', async () => {
    const failing = new FeatureFlagService(DEFAULT_FLAGS, async () =>
      jsonResponse({ flags: { voice: true } }, 500),
    );
    await failing.load();
    expect(failing.enabled('voice')).toBe(false);

    const malformed = new FeatureFlagService(DEFAULT_FLAGS, async () =>
      jsonResponse({ voice: true }),
    );
    await malformed.load();
    expect(malformed.enabled('voice')).toBe(false);
  });

  it('Should honor injected initial flags without fetching', () => {
    const flags = new FeatureFlagService({ voice: true });
    expect(flags.enabled('voice')).toBe(true);
  });
});
