import { PRODUCT_DIGEST } from './productDigest';

/**
 * Next Iran-local boundary for the digest (00:00 / 06:00 / 12:00 / 18:00 when
 * interval is 6h). Always strictly after `now`.
 */
export function nextProductDigestAt(
  now: Date,
  intervalMs: number = PRODUCT_DIGEST.intervalMs,
): Date {
  const offset = PRODUCT_DIGEST.iranOffsetMs;
  const iranMs = now.getTime() + offset;
  const iran = new Date(iranMs);
  const y = iran.getUTCFullYear();
  const month = iran.getUTCMonth();
  const day = iran.getUTCDate();
  const hour = iran.getUTCHours();
  const minute = iran.getUTCMinutes();
  const second = iran.getUTCSeconds();
  const ms = iran.getUTCMilliseconds();

  const intervalHours = intervalMs / 3_600_000;
  const hours = hour + minute / 60 + second / 3600 + ms / 3_600_000;
  let slot = Math.ceil(hours / intervalHours) * intervalHours;
  if (slot <= hours) slot += intervalHours;

  const dayOffset = Math.floor(slot / 24);
  const slotHour = slot - dayOffset * 24;
  const wholeHour = Math.floor(slotHour);
  const minutePart = Math.round((slotHour - wholeHour) * 60);

  const boundaryIranAsUtc = Date.UTC(y, month, day + dayOffset, wholeHour, minutePart, 0, 0);
  return new Date(boundaryIranAsUtc - offset);
}

/** Previous closed window ending at `to` (exclusive end). */
export function productDigestWindow(
  to: Date,
  intervalMs: number = PRODUCT_DIGEST.intervalMs,
): { from: Date; to: Date } {
  return { from: new Date(to.getTime() - intervalMs), to };
}
