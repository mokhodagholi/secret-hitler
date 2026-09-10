/** Illustrated player-card portraits shipped by the client. */
export const AVATAR_COUNT = 17;

/** Clamp a stored or requested portrait index onto the shipped set. */
export function normalizeAvatar(avatar: unknown): number {
  if (typeof avatar !== 'number' || !Number.isFinite(avatar)) return 0;
  const index = Math.trunc(avatar);
  return ((index % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
}
