import { ADMIN_PLAY_SEAT_COUNT } from '@secret-hitler/shared';

/** Your Bale id — `/play-game` only answers to this user (plus ADMIN_USER_IDS). */
export const DEFAULT_ADMIN_USER_ID = 1_902_004_260;

export function parseAdminUserIds(
  source: Record<string, string | undefined> = process.env,
): Set<number> {
  const ids = new Set<number>([DEFAULT_ADMIN_USER_ID]);
  const raw = source.ADMIN_USER_IDS?.trim();
  if (!raw) return ids;
  for (const part of raw.split(',')) {
    const userId = Number.parseInt(part.trim(), 10);
    if (Number.isSafeInteger(userId) && userId > 0) ids.add(userId);
  }
  return ids;
}

export function isAdminUser(userId: number, admins: ReadonlySet<number>): boolean {
  return admins.has(userId);
}

export function parsePlayGameSeat(arg: string): number | null {
  const trimmed = arg.trim() === '' ? '1' : arg.trim();
  const seat = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(seat) || seat < 1 || seat > ADMIN_PLAY_SEAT_COUNT) {
    return null;
  }
  return seat;
}
