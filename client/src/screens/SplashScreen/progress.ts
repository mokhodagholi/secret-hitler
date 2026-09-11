/** Count 0 → 100 over this window when the boot set is already on disk. */
export const SPLASH_PROGRESS_MS = 800;

/** Nudge the painted percent toward the real download, never past it. */
export function advanceSplashPercent(
  shown: number,
  actual: number,
  deltaMs: number,
  durationMs: number = SPLASH_PROGRESS_MS,
): number {
  if (actual <= 0) return 0;
  const step = (100 / durationMs) * Math.max(0, deltaMs);
  return Math.min(actual, shown + step);
}

export function splashPercentFromBytes(loaded: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (loaded / total) * 100);
}
