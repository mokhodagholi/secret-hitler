/** Support-group product digest. See docs/product-analytics.md. */
export const PRODUCT_DIGEST = {
  /**
   * How often the bot posts to the support group.
   * Ship **6 hours** for now; plan to move to **24 hours** once the cadence
   * feels right.
   */
  intervalMs: 6 * 60 * 60_000,
  /** Invite → sat-that-room conversion look-ahead. */
  fillConvertWindowMs: 30 * 60_000,
  timeZone: 'Asia/Tehran',
  /** Iran is fixed UTC+3:30 (no DST since 2022). */
  iranOffsetMs: (3 * 60 + 30) * 60_000,
  /**
   * Timer jitter vs a boot clock that was hours ahead (which captures a
   * future slot and posts an empty digest). Only clamp past this slack.
   */
  futureBoundarySlackMs: 60_000,
  /** Evening cafe hours (Iran), used for the night-sitter goal. */
  eveningHourFrom: 18,
  eveningHourTo: 24,
} as const;

/**
 * Iran-day numbers we fight for. Baseline was 17 Sep 2026 (first full
 * events day). Do not treat friend-*requests sent* as a goal.
 */
export const PRODUCT_GOALS = {
  gamesFinished: 180,
  seatedUsers: 900,
  reached5: 350,
  friendAccepts: 40,
  tableInviteAccepts: 50,
  eveningSitters: 350,
  d1SitPct: 35,
  abandonPctMax: 12,
  fillSatPctMin: 20,
} as const;
