import { describe, expect, it, rs } from '@rstest/core';
import { afterEach } from '@rstest/core';
import {
  checkForUpdate,
  isNewerVersion,
  isUpdatePromptVisible,
  reloadToLatest,
} from './update';

afterEach(() => {
  rs.restoreAllMocks();
});

describe('isNewerVersion', () => {
  it('Should ignore the same build and empty remotes', () => {
    expect(isNewerVersion('abc', 'abc')).toBe(false);
    expect(isNewerVersion('', 'abc')).toBe(false);
  });

  it('Should flag a different build id', () => {
    expect(isNewerVersion('def', 'abc')).toBe(true);
  });
});

describe('checkForUpdate', () => {
  it('Should return true when the origin publishes a new version', async () => {
    const fetchImpl = rs.fn(async () =>
      new Response(JSON.stringify({ version: 'new' }), { status: 200 }),
    ) as unknown as typeof fetch;
    expect(await checkForUpdate(fetchImpl, 'old')).toBe(true);
  });

  it('Should stay quiet when the probe fails', async () => {
    const fetchImpl = rs.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await checkForUpdate(fetchImpl, 'old')).toBe(false);
  });
});

describe('isUpdatePromptVisible', () => {
  it('Should stay silent at the table and open after they leave', () => {
    expect(isUpdatePromptVisible(true, 'game')).toBe(false);
    expect(isUpdatePromptVisible(true, 'home')).toBe(true);
    expect(isUpdatePromptVisible(false, 'home')).toBe(false);
  });
});

describe('reloadToLatest', () => {
  it('Should replace the document with a cache-busting query', () => {
    const assign = rs.fn();
    reloadToLatest(assign);
    expect(assign).toHaveBeenCalled();
    const next = String(assign.mock.calls[0]?.[0]);
    expect(next).toContain('v=');
  });
});
