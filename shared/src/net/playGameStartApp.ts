/** How many dummy seats an admin `/play-game` table deals. */
export const ADMIN_PLAY_SEAT_COUNT = 5;

const PAYLOAD = /^p([1-9])([A-Za-z0-9]{6})$/i;

/** Mini-app startapp: `p1ABC123` — seat 1 at room ABC123. */
export function playGameStartApp(code: string, seat: number): string {
  return `p${seat}${code.toUpperCase()}`;
}

export function parsePlayGameStartApp(
  param: string | null | undefined,
): { code: string; seat: number } | null {
  const match = PAYLOAD.exec(param?.trim() ?? '');
  if (!match) return null;
  const seat = Number.parseInt(match[1], 10);
  if (seat < 1 || seat > ADMIN_PLAY_SEAT_COUNT) return null;
  return { code: match[2].toUpperCase(), seat };
}
