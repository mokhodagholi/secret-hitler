import { describe, expect, it, rs } from '@rstest/core';
import { afterEach } from '@rstest/core';
import {
  activateWaitingAndReload,
  checkForUpdate,
  clearUpdatePreview,
  isNewerVersion,
  isUpdatePreview,
  isUpdatePromptVisible,
  reloadToLatest,
  SKIP_WAITING,
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

describe('isUpdatePreview', () => {
  it('Should open only when update=1 is in the query', () => {
    expect(isUpdatePreview('')).toBe(false);
    expect(isUpdatePreview('?v=2')).toBe(false);
    expect(isUpdatePreview('?update=1', true)).toBe(true);
    expect(isUpdatePreview('?update=0', true)).toBe(false);
  });

  it('Should ignore the flag outside development', () => {
    expect(isUpdatePreview('?update=1', false)).toBe(false);
  });
});

describe('clearUpdatePreview', () => {
  it('Should drop the preview flag and keep the rest of the query', () => {
    const replace = rs.fn();
    clearUpdatePreview('http://localhost:3000/?update=1&lang=fa', replace);
    expect(replace).toHaveBeenCalledWith('/?lang=fa');
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

describe('activateWaitingAndReload', () => {
  it('Should tell a waiting worker to take over before reloading', async () => {
    const reload = rs.fn();
    const waiting = { postMessage: rs.fn() };
    await activateWaitingAndReload(reload, async () => ({ waiting }));
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: SKIP_WAITING });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('Should still reload when no worker is waiting', async () => {
    const reload = rs.fn();
    await activateWaitingAndReload(reload, async () => undefined);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
