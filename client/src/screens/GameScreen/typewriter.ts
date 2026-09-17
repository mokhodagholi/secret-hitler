/** Pace typing so the subtitle finishes with the spoken line. */
export function typeDelayMs(
  index: number,
  total: number,
  durationMs: number,
): number {
  if (total <= 1) return Math.max(12, Math.round(durationMs));
  const perChar = durationMs / Math.max(1, total - 1);
  // Mild ease-in: first chars a bit slower, last a bit faster — still sum ≈ durationMs.
  const progress = index / (total - 1);
  const weight = 1.18 - progress * 0.36;
  return Math.max(8, Math.round(perChar * weight));
}
