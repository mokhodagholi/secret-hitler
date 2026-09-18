# Product analytics — data assistant

**Purpose:** one place for you or an agent to answer any live product/data
question from production Postgres. Open this first when the ask is metrics,
funnel, invites, blasts, social, games, or “what happened to user X”.

Related design docs (read only when needed):

| Topic | Doc |
|---|---|
| Lobby-fill DMs | [`lobby-fill.md`](./lobby-fill.md) |
| Support-group digest (bot) | this file → **Support-group digest** |
| Bale bot /broadcast | [`bale-bot.md`](./bale-bot.md) |
| Public table | [`public-table.md`](./public-table.md) |
| Schema (code) | `server/src/db/schema.ts` |
| Event writers | `server/src/product/ProductTracker.ts`, `LobbyFillService.ts` |
| Digest service | `server/src/product/ProductDigestService.ts` |

---

## Support-group digest

The bot posts a **Persian ops digest** to each configured support group
(`BALE_SUPPORT_CHAT_ID` / `TELEGRAM_SUPPORT_CHAT_ID`) on Iran-local boundaries.

| Knob | Value now | Future |
|---|---|---|
| Cadence | **every 6 hours** (00 / 06 / 12 / 18 ایران) | move to **24h** via `PRODUCT_DIGEST.intervalMs` |
| Warm invite lookback (fill DMs) | **6 hours** | unchanged by digest cadence |

Message shape (same numbers the assistant uses in SQL recipes):

```
📊 ۱۲:۰۰–۱۸:۰۰ ایران

نفرها
  مینی‌اپ: … · نشستند: …
  میز زنده الان: …

لابی
  باز … · شروع … · مرده …
  دلیل مرگ: …
  پیک صندلی: ۱–۲→… · ۳–۴→… · ۵+→…

پر کردن لابی
  دعوت … · خطا …
  نشستند سر همان میز: … (…٪)

بازی
  شروع … · تمام … · رها …

🎯 امروز ایران تا ۱۸:۰۰
  بازی تمام: … / 180
  نشستند: … / 900
  رسیدن به ۵: … / 350
  قبول دوست: … / 40
  قبول دعوت میز: … / 50
  نشست شب: … / 350
  برگشت فردا تا الان: …٪ / 35٪
نگهبان
  رها: …٪ · سقف 12٪
  پر کردن میز: …٪ · کف 20٪
```

The 🎯 block is the **Iran-day fight scoreboard** (today so far at 06/12/18;
the day that just closed at 00:00). Goals live in `PRODUCT_GOALS`
(`server/src/product/productDigest.ts`). Do **not** treat friend-requests
*sent* as a goal — only **accepts**. `نشست شب` is unique `seated` at Iran
hours 18–23 (`—` before 18:00). D1 = yesterday’s sitters who sat again on
the scoreboard day. Code: `productDigest.ts`, `summarizeProductDigest.ts`,
`ProductDigestService.ts`. Agent: `/data-assis-metrics`.

Notes:

- Skips noisy `bot_start` (floods; not demand).
- Fill conversion = invite → `seated`/`room_join` on **that** `room_code` within 30m.
- Needs a support chat id; no feature flag. Starts with the server.

---

## Connect (always)

```bash
ssh root@195.248.241.251
docker exec secret-hitler-postgres psql -U secret_hitler -d secret_hitler -c "…"
```

Rules:

- Prefer `docker exec … psql`. **Never** print `.env`, `DATABASE_URL`, bot
  tokens, or passwords into chat.
- DB timestamps are **UTC**. Iran: `col AT TIME ZONE 'Asia/Tehran'`.
- Confirm clock: `SELECT NOW();`
- Feature flags live in `/root/secret-hitler/.env` (e.g. `FEATURE_LOBBY_FILL`).

One-liner from your laptop:

```bash
ssh root@195.248.241.251 \
  "docker exec secret-hitler-postgres psql -U secret_hitler -d secret_hitler -c \"SELECT 1\""
```

---

## Full data map

Everything durable in Postgres today:

| Table | What it is | Good for |
|---|---|---|
| `product_events` | Funnel crumbs + fill invite/fail/wave | Almost every “how many / did they…” question |
| `product_lobbies` | One lobby life: open → peak → deal or die | Host-left, peak seats, hour-of-day |
| `product_matches` | Deal → end (outcome, disconnects, kicks) | Match health, abandon rate |
| `product_blasts` | Admin `/broadcast` or `/message` fan-out | Blast size / when sent |
| `product_blast_recipients` | Per chat: opened? sat? | Blast ROI |
| `bot_subscribers` | Chats we can still DM | Reachable audience size |
| `bot_blast_deliveries` | Last blast message ids (for `/unsend`) | Ops only, not product ROI |
| `profiles` | Avatar + optional Bale/Telegram id | Linked messenger accounts |
| `games` / `game_players` | Finished game history | Wins, table size, roles |
| `live_rooms` | In-memory room snapshots for restart | Live ops, not analytics |
| `friendships` | Accepted friend pairs | Social graph size |
| `friend_requests` | pending / accepted / … | Request funnel |
| `table_invites` | Friend “come to my table” invites | Social invite usage |
| `social_blocks` | Player blocked player in-app | Abuse / ignore |

Not in DB (or not useful for product metrics): chat text, voice RTP, raw
WebSocket frames, Bale “DM opened” (messenger doesn’t tell us).

### `product_events.name`

| Name | Meaning |
|---|---|
| `bot_start` | Private bot start |
| `miniapp_auth` | Mini-app opened/authed (also marks blast *opened*) |
| `find_match` | Legacy Find Match queue (unused while the salon is on) |
| `room_create` / `room_join` / `group_create` | How the table was born / joined |
| `own_room_prompt` | Opened the “own table” dialog on Join |
| `own_room_want` | Tapped “I want my own table” (does not Create) |
| `lobby_nudge_prompt` | Waiting-room “fuller table” modal opened |
| `lobby_nudge_join` | Sat the offered fuller table from that modal |
| `seated` | Sat a tracked table (also marks blast *sat*) |
| `table_dealt` | Cards dealt |
| `game_finished` / `game_abandoned` | Match end crumbs |
| `lobby_died` | Lobby empty / host left / afk |
| `lobby_fill_invite` | Fill DM **delivered** |
| `lobby_fill_fail` | Fill DM failed — see `payload.reason` |
| `lobby_fill_wave` | One fill attempt summary |

`user_key`: `bale:123`, `telegram:123`, or `client:uuid` (browser).  
`lobby_fill_fail.reason`: `rate_limit` | `blocked` | `bad_user_key` | `other`.  
`lobby_fill_wave.stop`: `done` | `no_candidates` | `lobby_gone` | `table_full`.

### Lobby / match enums

- Lobby `source`: `hosted` | `public` | `group`
- Lobby `death_reason`: `host_left` | `never_started` | `afk_kick`
- Match `outcome`: `liberal_policy` | `hitler_executed` | `fascist_policy` |
  `hitler_elected` | `fascist_numbers` | `abandoned`

---

## Intent → where to look

| User asks… | Start with |
|---|---|
| How many starts / miniapp / sits today? | `product_events` distinct `user_key` |
| Did people want their own table? | `own_room_prompt` / `own_room_want` |
| Did thin lobbies move to a fuller table? | `lobby_nudge_prompt` / `lobby_nudge_join` |
| Did lobby-fill work? Conversion? | `lobby_fill_*` + join to `seated` |
| Why did this invite fail? | `lobby_fill_fail` then user timeline |
| When did user X join / block? | `product_events` + `bot_subscribers` |
| How big is our audience? | `bot_subscribers` (+ note blockers drop) |
| Did /broadcast bring people back? | `product_blasts` + recipients `opened_at` / `sat_at` |
| Why do lobbies die? | `product_lobbies.death_reason`, peak seats |
| When do people play (Iran hour)? | `product_lobbies.hour_iran` or trunc `at` |
| Who wins / table sizes? | `games`, `game_players` |
| Friends / invites / blocks? | `friendships`, `friend_requests`, `table_invites`, `social_blocks` |
| Community fight scoreboard? | Iran-day vs `PRODUCT_GOALS` — `/data-assis-metrics` |
| What’s live right now? | `live_rooms` count (+ server if needed) |

---

## Recipe pack

Change the interval (`'1 hour'`, `'9 hours'`, `'1 day'`) as asked.

### Inventory (row counts)

```sql
SELECT 'product_events' AS t, COUNT(*) FROM product_events
UNION ALL SELECT 'product_lobbies', COUNT(*) FROM product_lobbies
UNION ALL SELECT 'product_matches', COUNT(*) FROM product_matches
UNION ALL SELECT 'product_blasts', COUNT(*) FROM product_blasts
UNION ALL SELECT 'bot_subscribers', COUNT(*) FROM bot_subscribers
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'games', COUNT(*) FROM games
UNION ALL SELECT 'friendships', COUNT(*) FROM friendships
UNION ALL SELECT 'friend_requests', COUNT(*) FROM friend_requests
UNION ALL SELECT 'table_invites', COUNT(*) FROM table_invites
UNION ALL SELECT 'live_rooms', COUNT(*) FROM live_rooms;
```

### Event mix in a window

```sql
SELECT name, COUNT(*) AS events,
       COUNT(DISTINCT user_key) AS unique_users
FROM product_events
WHERE at >= NOW() - INTERVAL '1 day'
GROUP BY name
ORDER BY events DESC;
```

### Funnel (unique users)

```sql
SELECT
  COUNT(DISTINCT user_key) FILTER (WHERE name = 'bot_start') AS starters,
  COUNT(DISTINCT user_key) FILTER (WHERE name = 'miniapp_auth') AS miniapp,
  COUNT(DISTINCT user_key) FILTER (WHERE name = 'seated') AS seated,
  COUNT(DISTINCT user_key) FILTER (WHERE name = 'find_match') AS find_match,
  COUNT(DISTINCT user_key) FILTER (WHERE name = 'room_create') AS creators
FROM product_events
WHERE at >= NOW() - INTERVAL '1 day'
  AND user_key IS NOT NULL;
```

### Lobby fill — volume

```sql
SELECT
  COUNT(*) FILTER (WHERE name = 'lobby_fill_invite') AS invited,
  COUNT(*) FILTER (WHERE name = 'lobby_fill_fail') AS failed,
  COUNT(*) FILTER (WHERE name = 'lobby_fill_wave') AS waves
FROM product_events
WHERE at >= NOW() - INTERVAL '1 hour'
  AND name LIKE 'lobby_fill_%';
```

```sql
SELECT payload->>'reason' AS reason, COUNT(*),
       MAX(payload->>'detail') AS sample_detail
FROM product_events
WHERE name = 'lobby_fill_fail'
  AND at >= NOW() - INTERVAL '1 day'
GROUP BY 1
ORDER BY 2 DESC;
```

```sql
SELECT payload->>'stop' AS stop, COUNT(*) AS waves,
       SUM((payload->>'invited')::int) AS invited,
       SUM((payload->>'failed')::int) AS failed,
       SUM((payload->>'candidates')::int) AS candidates
FROM product_events
WHERE name = 'lobby_fill_wave'
  AND at >= NOW() - INTERVAL '1 day'
GROUP BY 1;
```

### Lobby fill — conversion (invite → that room)

```sql
WITH invites AS (
  SELECT user_key, room_code, at AS invited_at
  FROM product_events
  WHERE name = 'lobby_fill_invite'
    AND at >= NOW() - INTERVAL '9 hours'
)
SELECT
  COUNT(*) AS invites,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM product_events e
    WHERE e.user_key = i.user_key AND e.name = 'miniapp_auth'
      AND e.at >= i.invited_at AND e.at < i.invited_at + INTERVAL '30 minutes'
  )) AS opened_miniapp_30m,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM product_events e
    WHERE e.user_key = i.user_key
      AND e.name IN ('seated', 'room_join')
      AND e.room_code = i.room_code
      AND e.at >= i.invited_at AND e.at < i.invited_at + INTERVAL '30 minutes'
  )) AS sat_that_room_30m
FROM invites i;
```

### Lobby fill — hourly (Iran)

```sql
SELECT date_trunc('hour', at AT TIME ZONE 'Asia/Tehran') AS hour_iran,
       COUNT(*) FILTER (WHERE name = 'lobby_fill_invite') AS invites,
       COUNT(*) FILTER (WHERE name = 'lobby_fill_fail') AS fails,
       COUNT(*) FILTER (WHERE name = 'lobby_fill_wave') AS waves
FROM product_events
WHERE at >= NOW() - INTERVAL '1 day'
  AND name LIKE 'lobby_fill_%'
GROUP BY 1
ORDER BY 1;
```

### User timeline

```sql
SELECT at AT TIME ZONE 'Asia/Tehran' AS at_iran, name, room_code, payload
FROM product_events
WHERE user_key = 'bale:USER_ID'
ORDER BY at;
```

```sql
SELECT started_at AT TIME ZONE 'Asia/Tehran' AS started_iran
FROM bot_subscribers
WHERE platform = 'bale' AND chat_id = 'USER_ID';
```

Missing subscriber row after `blocked` fail is expected (we remove them).

### Lobby health

```sql
SELECT source, COUNT(*) AS lobbies,
       ROUND(AVG(peak_seats)::numeric, 2) AS avg_peak,
       COUNT(*) FILTER (WHERE reached_5_at IS NOT NULL) AS reached_5,
       COUNT(*) FILTER (WHERE dealt_at IS NOT NULL) AS dealt,
       COUNT(*) FILTER (WHERE died_at IS NOT NULL AND dealt_at IS NULL) AS died_empty
FROM product_lobbies
WHERE opened_at >= NOW() - INTERVAL '1 day'
GROUP BY source
ORDER BY lobbies DESC;
```

```sql
SELECT death_reason, COUNT(*)
FROM product_lobbies
WHERE died_at >= NOW() - INTERVAL '1 day'
GROUP BY 1
ORDER BY 2 DESC;
```

```sql
SELECT hour_iran, COUNT(*) AS lobbies,
       COUNT(*) FILTER (WHERE dealt_at IS NOT NULL) AS dealt
FROM product_lobbies
WHERE opened_at >= NOW() - INTERVAL '7 days'
GROUP BY hour_iran
ORDER BY hour_iran;
```

```sql
SELECT peak_seats, COUNT(*) AS lobbies,
       COUNT(*) FILTER (WHERE dealt_at IS NOT NULL) AS dealt
FROM product_lobbies
WHERE opened_at >= NOW() - INTERVAL '1 day'
GROUP BY peak_seats
ORDER BY peak_seats;
```

### Match health

```sql
SELECT COALESCE(outcome, '(open)') AS outcome, COUNT(*) AS matches,
       ROUND(AVG(disconnects)::numeric, 2) AS avg_disc,
       ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::numeric, 1) AS avg_min
FROM product_matches
WHERE started_at >= NOW() - INTERVAL '1 day'
GROUP BY 1
ORDER BY matches DESC;
```

### Finished games (history)

```sql
SELECT (ended_at AT TIME ZONE 'Asia/Tehran')::date AS day_iran,
       COUNT(*) AS games,
       COUNT(*) FILTER (WHERE winner = 'fascist') AS fascist,
       COUNT(*) FILTER (WHERE winner = 'liberal') AS liberal,
       ROUND(AVG(player_count)::numeric, 1) AS avg_players
FROM games
GROUP BY 1
ORDER BY 1 DESC
LIMIT 14;
```

```sql
SELECT player_count, COUNT(*) FROM games GROUP BY 1 ORDER BY 1;
```

```sql
SELECT role, COUNT(*), COUNT(*) FILTER (WHERE won) AS wins
FROM game_players
GROUP BY role
ORDER BY COUNT(*) DESC;
```

### Admin blasts ROI

```sql
SELECT id, platform, sent_at AT TIME ZONE 'Asia/Tehran' AS sent_iran, reached,
  (SELECT COUNT(*) FROM product_blast_recipients r
   WHERE r.blast_id = b.id AND opened_at IS NOT NULL) AS opened,
  (SELECT COUNT(*) FROM product_blast_recipients r
   WHERE r.blast_id = b.id AND sat_at IS NOT NULL) AS sat
FROM product_blasts b
ORDER BY sent_at DESC
LIMIT 10;
```

```sql
SELECT
  ROUND(100.0 * COUNT(*) FILTER (WHERE opened_at IS NOT NULL) / NULLIF(COUNT(*), 0), 2) AS open_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE sat_at IS NOT NULL) / NULLIF(COUNT(*), 0), 2) AS sat_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE sat_at IS NOT NULL)
    / NULLIF(COUNT(*) FILTER (WHERE opened_at IS NOT NULL), 0), 2) AS sat_of_open_pct,
  COUNT(*) AS recipients
FROM product_blast_recipients;
```

### Community fight scoreboard (Iran day)

Goals: `PRODUCT_GOALS` in `server/src/product/productDigest.ts`.
North star is finished games (not abandoned). Count **accepts**, never
requests sent. Swap the day filter as needed; midnight digest uses the
closed yesterday.

```sql
-- Unique sitters + evening cafe
SELECT
  COUNT(DISTINCT user_key) FILTER (WHERE name = 'seated') AS seated,
  COUNT(DISTINCT user_key) FILTER (
    WHERE name = 'seated'
      AND EXTRACT(HOUR FROM at AT TIME ZONE 'Asia/Tehran') BETWEEN 18 AND 23
  ) AS seated_evening
FROM product_events
WHERE name = 'seated' AND user_key IS NOT NULL
  AND (at AT TIME ZONE 'Asia/Tehran')::date = DATE '2026-09-17';
```

```sql
-- D1 sit: yesterday's sitters who sat again today
WITH y AS (
  SELECT DISTINCT user_key FROM product_events
  WHERE name = 'seated' AND user_key IS NOT NULL
    AND (at AT TIME ZONE 'Asia/Tehran')::date = DATE '2026-09-16'
),
t AS (
  SELECT DISTINCT user_key FROM product_events
  WHERE name = 'seated' AND user_key IS NOT NULL
    AND (at AT TIME ZONE 'Asia/Tehran')::date = DATE '2026-09-17'
)
SELECT
  (SELECT COUNT(*) FROM y) AS sat_yesterday,
  COUNT(*) FILTER (WHERE t.user_key IS NOT NULL) AS returned,
  ROUND(100.0 * COUNT(*) FILTER (WHERE t.user_key IS NOT NULL)
    / NULLIF((SELECT COUNT(*) FROM y), 0), 1) AS d1_pct
FROM y
LEFT JOIN t USING (user_key);
```

```sql
-- Reached 5 + finished games + abandon
SELECT COUNT(*) AS reached_5
FROM product_lobbies
WHERE reached_5_at IS NOT NULL
  AND (reached_5_at AT TIME ZONE 'Asia/Tehran')::date = DATE '2026-09-17';

SELECT
  COUNT(*) FILTER (WHERE outcome IS NOT NULL AND outcome <> 'abandoned') AS finished,
  COUNT(*) FILTER (WHERE outcome = 'abandoned') AS abandoned
FROM product_matches
WHERE ended_at IS NOT NULL
  AND (ended_at AT TIME ZONE 'Asia/Tehran')::date = DATE '2026-09-17';
```

```sql
-- Player-pulled accepts (resolved that Iran day)
SELECT COUNT(*) FROM friend_requests
WHERE status = 'accepted'
  AND (resolved_at AT TIME ZONE 'Asia/Tehran')::date = DATE '2026-09-17';

SELECT COUNT(*) FROM table_invites
WHERE status = 'accepted'
  AND (resolved_at AT TIME ZONE 'Asia/Tehran')::date = DATE '2026-09-17';
```

### Audience

```sql
SELECT platform, COUNT(*) AS subscribers FROM bot_subscribers GROUP BY 1;

SELECT COUNT(*) AS profiles,
       COUNT(bale_user_id) AS with_bale,
       COUNT(telegram_user_id) AS with_telegram
FROM profiles;

-- New subscribers by Iran day
SELECT (started_at AT TIME ZONE 'Asia/Tehran')::date AS day, COUNT(*)
FROM bot_subscribers
GROUP BY 1
ORDER BY 1 DESC
LIMIT 14;
```

### Social

```sql
SELECT COUNT(*) AS friendships FROM friendships;

SELECT status, COUNT(*) FROM friend_requests GROUP BY status;

SELECT status, COUNT(*) FROM table_invites GROUP BY status;

SELECT COUNT(*) AS social_blocks FROM social_blocks;
```

### Live right now

```sql
SELECT COUNT(*) AS live_rooms FROM live_rooms;
SELECT code, updated_at AT TIME ZONE 'Asia/Tehran' AS updated_iran
FROM live_rooms
ORDER BY updated_at DESC
LIMIT 20;
```

---

## How the assistant should work

1. **Match intent** to the table above (don’t invent new metrics).
2. **SSH + psql** with a clear window (`NOW() - INTERVAL …`).
3. Prefer **aggregates** first; drill into users/rooms only when asked.
4. Report: window + timezone → numbers → **one** takeaway sentence.
5. Define jargon once if needed (**DM** = private bot message to one user).
6. If data is missing (e.g. no `lobby_fill_wave` before that commit shipped),
   say so — don’t pretend.
7. Support-group digests are already posted every **6h** Iran time — when the
   user asks “what happened this window?”, prefer matching that digest shape
   (people → lobby → fill → games, then the 🎯 scoreboard) so chat and bot
   stay aligned. For the fight goals specifically, `/data-assis-metrics`.

### Cautions

- `bot_start` unique ≠ `bot_subscribers` (starts can exceed list; blockers drop).
- Room codes **reuse**; when joining invites → lobbies, prefer the lobby whose
  `opened_at` is near the invite time.
- Bale ~**3 req/s**. Prefer fill invites over mass `/broadcast`.
- Never dump secrets. Never run destructive SQL unless the user explicitly asks.

### Agent map

`AGENTS.md` points here for “Live metrics / SQL recipes (VPS)”.
