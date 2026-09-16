import type { ProductEvent, WarmInviteQuery } from './ProductStore';
import { LOBBY_FILL } from './lobbyFill';

/**
 * Rank warm messenger userKeys for lobby-fill DMs from product_events crumbs.
 * Pure so in-memory and Postgres stores share one policy.
 */
export function rankWarmInviteTargets(
  events: readonly ProductEvent[],
  query: WarmInviteQuery,
): string[] {
  const nowMs = query.now.getTime();
  const warmSince = nowMs - query.warmWindowMs;
  const lookbackSince =
    nowMs - Math.max(query.warmWindowMs, query.inviteCooldownMs, LOBBY_FILL.activityLookbackMs);
  const byUser = new Map<
    string,
    { lastFind: number; lastWarm: number; lastGame: number; lastInvite: number }
  >();

  for (const event of events) {
    if (event.platform !== query.platform || !event.userKey) continue;
    const at = event.at.getTime();
    if (at < lookbackSince) continue;
    let row = byUser.get(event.userKey);
    if (!row) {
      row = { lastFind: 0, lastWarm: 0, lastGame: 0, lastInvite: 0 };
      byUser.set(event.userKey, row);
    }
    if (event.name === 'find_match' && at > row.lastFind) row.lastFind = at;
    if ((event.name === 'seated' || event.name === 'miniapp_auth') && at > row.lastWarm) {
      row.lastWarm = at;
    }
    if (event.name === 'game_finished' && at > row.lastGame) row.lastGame = at;
    if (event.name === 'lobby_fill_invite' && at > row.lastInvite) row.lastInvite = at;
  }

  const ranked: { userKey: string; findBoost: number; activityAt: number }[] = [];
  for (const [userKey, row] of byUser) {
    if (query.excludeUserKeys.has(userKey)) continue;
    const activityAt = Math.max(row.lastFind, row.lastWarm);
    if (activityAt < warmSince) continue;
    if (row.lastGame > 0 && nowMs - row.lastGame < query.postGameCooldownMs) continue;
    if (row.lastInvite > 0 && nowMs - row.lastInvite < query.inviteCooldownMs) continue;
    ranked.push({
      userKey,
      findBoost: row.lastFind >= warmSince ? 1 : 0,
      activityAt,
    });
  }

  ranked.sort((left, right) => {
    if (right.findBoost !== left.findBoost) return right.findBoost - left.findBoost;
    return right.activityAt - left.activityAt;
  });
  return ranked.slice(0, query.limit).map((row) => row.userKey);
}
