import { describe, expect, it } from '@rstest/core';
import {
  SPLASH_PROGRESS_MS,
  advanceSplashPercent,
  splashPercentFromBytes,
} from './progress';

describe('advanceSplashPercent', () => {
  it('Should stay at 0 until a download has actually started', () => {
    expect(advanceSplashPercent(12, 0, 50)).toBe(0);
  });

  it('Should climb toward 100 across the splash window when the files are already done', () => {
    let shown = 0;
    shown = advanceSplashPercent(shown, 100, SPLASH_PROGRESS_MS / 2);
    expect(shown).toBe(50);
    shown = advanceSplashPercent(shown, 100, SPLASH_PROGRESS_MS / 2);
    expect(shown).toBe(100);
  });

  it('Should not paint ahead of the real download', () => {
    expect(advanceSplashPercent(0, 20, SPLASH_PROGRESS_MS)).toBe(20);
  });
});

describe('splashPercentFromBytes', () => {
  it('Should be 0 when nothing has been asked for yet', () => {
    expect(splashPercentFromBytes(0, 0)).toBe(0);
  });

  it('Should follow downloaded bytes', () => {
    expect(splashPercentFromBytes(4, 8)).toBe(50);
  });
});
