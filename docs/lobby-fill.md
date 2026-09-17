# Lobby fill invites

Server DMs that pull warm players into a waiting table. Ships dark behind
`FEATURE_LOBBY_FILL` (default off). Not a replacement for the public salon —
only a backfill when a lobby already has **2+** seats and still needs people
to deal. With `FEATURE_PUBLIC_TABLE` that lobby is the one Join table.

## Why

Hosted lobbies often die at 1–3 seats (`host_left`). Once peak ≥5, most tables
deal. Mass `/broadcast` is too slow under Bale’s ~3 req/s limit and burns trust.
A short deep-link DM to a few warm users when a real room is waiting stays
inside the rate limit and converts better.

## When it fires

Every ~15s the server scans live lobbies (`LobbyFillService`):

1. Phase is lobby, unlocked (no password), not an admin `/play-game` table.
2. Seat count is **2–4** (a pair waiting; still short of the deal minimum of 5).
   Solo hosts (1 seat) are skipped so a person sitting alone does not ping the
   warm pool.
3. That room has been in the needy band for **≥75s**.
4. No fill wave for that room in the last **75s**.

Then it DMs up to `min(3, seats-needed-to-reach-5)` warm users (Bale first,
then Telegram if configured), **400ms** apart (~2.5 msg/s).

Copy (fa):

```
یه میز N نفره منتظرته.
بیا تو اتاق تا بازی زودتر شروع بشه.
```

Button: **ورود به اتاق** → mini-app `startapp` with that room code (same path as
friend invites).

## Who gets the DM

Ranked from `product_events` (`listWarmInviteTargets` /
`rankWarmInviteTargets`):

| Prefer | Signal |
|---|---|
| 1 | `find_match` in the last 6 hours |
| 2 | `seated` or `miniapp_auth` in the last 6 hours |

| Skip | Reason |
|---|---|
| Currently seated anywhere | Already at a table |
| In Find Match queue | Already looking |
| `game_finished` in last 30 minutes | Just finished — likely tired |
| `lobby_fill_invite` in last 12 hours | Cap spam |
| Already invited for this room this process | Per-room dedupe |
| Cold `/start` only | Low convert; not worth a seat ping |

Warm window is **6 hours** (was 90m) so lukewarm players still get a chance;
ranking still prefers fresher `find_match` first. Rate timers
(`sendDelayMs` 400ms, max 3/wave, 12h invite cooldown) are unchanged.

Successful sends record `lobby_fill_invite`. Every wave also records
`lobby_fill_wave` (seats, limit, candidates, invited, failed, stop). Failed DMs
record `lobby_fill_fail` with `reason`: `rate_limit` | `blocked` |
`bad_user_key` | `other`. Hard 403 blocks drop the chat from `bot_subscribers`;
**429 rate limits do not**.

### Measurement queries

Full data-assistant runbook (all tables, funnel, blasts, social, games, support digest):
[`product-analytics.md`](./product-analytics.md).

```sql
-- Invites and conversion in the last day
SELECT COUNT(*) FILTER (WHERE name = 'lobby_fill_invite') AS invited,
       COUNT(*) FILTER (WHERE name = 'lobby_fill_fail') AS failed,
       COUNT(*) FILTER (WHERE name = 'lobby_fill_wave') AS waves
FROM product_events
WHERE at > NOW() - INTERVAL '1 day'
  AND name LIKE 'lobby_fill_%';

-- Empty warm pool vs delivered waves
SELECT payload->>'stop' AS stop, COUNT(*)
FROM product_events
WHERE name = 'lobby_fill_wave'
GROUP BY 1;
```

## Flag

| Flag | Env | Default |
|---|---|---|
| `lobbyFill` | `FEATURE_LOBBY_FILL` | off |

Turn on in production `.env` after deploy. Needs a configured Bale and/or
Telegram runtime; otherwise the service stays null even if the flag is on.

## Code map

| Piece | Path |
|---|---|
| Timing / batch constants | `server/src/product/lobbyFill.ts` |
| Warm ranking | `server/src/product/rankWarmInviteTargets.ts` |
| Sweep + DM | `server/src/product/LobbyFillService.ts` |
| Reply + keyboard | `server/src/bale/commands.ts` `lobbyFillInviteReply` |
| Wiring | `server/src/app.ts` when `flags.lobbyFill` |
| Store API | `ProductStore.listWarmInviteTargets` |

## Ops notes

- Do **not** rely on this instead of filling tables organically at peak hours.
- Keep `/broadcast` rare (≤1/day). Broadcast delay is **350ms** so fan-out stays
  near 3 req/s; failed DMs only drop real blockers, not 429s.
- Watch `lobby_fill_invite` vs later `seated` / `room_join` on the same
  `user_key` to see if the pings work.
