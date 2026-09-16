/** Typing starts slow and speeds up a little. `index` is the character just shown. */
export function typeDelayMs(index: number, total: number): number {
  if (total <= 1) return 13;
  const progress = index / (total - 1);
  return Math.round((78 - progress * 46) / 3);
}
