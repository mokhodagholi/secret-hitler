import type { MessengerKind } from '@secret-hitler/shared';

/** Lobby fill invite timing and batching. See docs/lobby-fill.md. */
export const LOBBY_FILL = {
  /** Sweep live lobbies this often. */
  sweepMs: 15_000,
  /** Seats in [min, max] — 3+ waiting, still short of the deal minimum. */
  minSeats: 3,
  maxSeats: 4,
  /** Wait this long after a lobby first hits the needy band before DMing. */
  waitBeforeInviteMs: 75_000,
  /** Gap between waves for the same room. */
  waveCooldownMs: 75_000,
  /** Look back for miniapp / seated / find_match activity. */
  warmWindowMs: 90 * 60_000,
  /** Skip anyone who finished a game this recently. */
  postGameCooldownMs: 30 * 60_000,
  /** At most one fill DM per user in this window. */
  inviteCooldownMs: 12 * 60 * 60_000,
  /** Cap invites in one wave (also capped by seats needed to reach 5). */
  maxInvitesPerWave: 3,
  /** Stay under Bale's ~3 req/s; ~2.5/s with margin. */
  sendDelayMs: 400,
  /** Bound product_events scans when ranking warm users. */
  activityLookbackMs: 7 * 24 * 60 * 60_000,
} as const;

export type LobbyFillPlatform = MessengerKind;

export function seatsNeededForDeal(seated: number): number {
  return Math.max(0, 5 - seated);
}

export function invitesForWave(seated: number): number {
  const needed = seatsNeededForDeal(seated);
  if (needed <= 0) return 0;
  return Math.min(LOBBY_FILL.maxInvitesPerWave, Math.max(1, needed));
}
