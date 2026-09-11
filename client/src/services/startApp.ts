/**
 * Mini-app `startapp` / `start_param` payloads.
 * A 6-character room code is an invite; other kinds can land here later.
 */
const ROOM_CODE = /^[A-Za-z0-9]{6}$/;

export function joinCodeFromStartApp(param: string | null | undefined): string | null {
  const value = param?.trim();
  if (!value || !ROOM_CODE.test(value)) return null;
  return value.toUpperCase();
}
