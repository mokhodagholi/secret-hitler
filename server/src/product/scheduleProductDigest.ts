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

/** Most recently closed Iran-local boundary at or before `now`. */
export function lastProductDigestAt(
  now: Date,
  intervalMs: number = PRODUCT_DIGEST.intervalMs,
): Date {
  return new Date(nextProductDigestAt(now, intervalMs).getTime() - intervalMs);
}

/** Previous closed window ending at `to` (exclusive end). */
export function productDigestWindow(
  to: Date,
  intervalMs: number = PRODUCT_DIGEST.intervalMs,
): { from: Date; to: Date } {
  return { from: new Date(to.getTime() - intervalMs), to };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 00:00 Iran of the calendar day that contains `at`. */
export function iranDayStart(at: Date): Date {
  const offset = PRODUCT_DIGEST.iranOffsetMs;
  const shifted = new Date(at.getTime() + offset);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - offset,
  );
}

export interface ProductScoreboardRange {
  /** Scoreboard day start (inclusive). */
  dayFrom: Date;
  /** Scoreboard day end (exclusive) — digest boundary, or next midnight. */
  dayTo: Date;
  /** Previous Iran day, for D1. */
  previousFrom: Date;
  previousTo: Date;
  /** Fetch events from here (previous day start). */
  lookbackFrom: Date;
  /** True when `windowEnd` is 00:00 Iran — yesterday is a complete day. */
  complete: boolean;
}

/**
 * Iran-day scoreboard for a digest that just closed at `windowEnd`.
 * Midnight posts the day that just finished; 06/12/18 post today so far.
 */
export function productScoreboardRange(windowEnd: Date): ProductScoreboardRange {
  const offset = PRODUCT_DIGEST.iranOffsetMs;
  const shifted = new Date(windowEnd.getTime() + offset);
  const complete =
    shifted.getUTCHours() === 0 &&
    shifted.getUTCMinutes() === 0 &&
    shifted.getUTCSeconds() === 0 &&
    shifted.getUTCMilliseconds() === 0;

  const dayTo = windowEnd;
  const dayFrom = complete ? new Date(windowEnd.getTime() - MS_PER_DAY) : iranDayStart(windowEnd);
  const previousFrom = new Date(dayFrom.getTime() - MS_PER_DAY);
  return {
    dayFrom,
    dayTo,
    previousFrom,
    previousTo: dayFrom,
    lookbackFrom: previousFrom,
    complete,
  };
}
