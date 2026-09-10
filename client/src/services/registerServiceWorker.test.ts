import { describe, expect, it } from '@rstest/core';
import { shouldClaimWaitingWorker } from './registerServiceWorker';

describe('shouldClaimWaitingWorker', () => {
  it('Should take over on the first visit and wait once a worker already controls the page', () => {
    expect(shouldClaimWaitingWorker(false, true)).toBe(true);
    expect(shouldClaimWaitingWorker(true, true)).toBe(false);
    expect(shouldClaimWaitingWorker(false, false)).toBe(false);
  });
});
