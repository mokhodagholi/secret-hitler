/** Typing starts slow and speeds up a little. `index` is the character just shown. */
export function typeDelayMs(index: number, total: number): number {
  if (total <= 1) return 40;
  const progress = index / (total - 1);
  return 78 - progress * 46;
}

/**
 * Deleting starts fast and slows at the end. `remaining` is how many
 * characters are still on screen after this delete.
 */
export function deleteDelayMs(remaining: number, total: number): number {
  if (total <= 0) return 12;
  const progress = 1 - remaining / total;
  return 8 + progress * 42;
}
