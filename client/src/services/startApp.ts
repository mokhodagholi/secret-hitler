import { parsePlayGameStartApp } from '@secret-hitler/shared';

/**
 * Mini-app `startapp` / `start_param` payloads.
 * A 6-character room code is an invite; `p1ABC123` is an admin `/play-game` seat.
 */
const ROOM_CODE = /^[A-Za-z0-9]{6}$/;

export function joinCodeFromStartApp(param: string | null | undefined): string | null {
  if (parsePlayGameStartApp(param)) return null;
  const value = param?.trim();
  if (!value || !ROOM_CODE.test(value)) return null;
  return value.toUpperCase();
}

export { parsePlayGameStartApp };
