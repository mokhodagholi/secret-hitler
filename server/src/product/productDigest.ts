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
} as const;
