---
name: data-assis-metrics
description: >-
  Reports the community fight scoreboard vs PRODUCT_GOALS (finished games,
  sitters, D1 sit, tables to 5, friend/table-invite accepts, evening cafe,
  abandon and fill guards). Use when the user runs /data-assis-metrics or asks
  how the community goals, fight metrics, or scoreboard are doing.
disable-model-invocation: true
---

# Community fight scoreboard

Same numbers the support-group bot posts every **6h** Iran (🎯 block).
Do not invent metrics or treat friend-requests **sent** as a goal.

Source of truth: [`docs/product-analytics.md`](../../../docs/product-analytics.md)
(recipe: **Community fight scoreboard**). Goals:
[`server/src/product/productDigest.ts`](../../../server/src/product/productDigest.ts)
`PRODUCT_GOALS`.

## Workflow

1. Confirm clock: `SELECT NOW();` and `NOW() AT TIME ZONE 'Asia/Tehran'`.
2. Query production via SSH + `docker exec` psql (never print `.env` / tokens).
3. Report **today so far** (Iran 00:00 → now) **and** the **last complete Iran day**.
4. Compare each line to `PRODUCT_GOALS`. One takeaway sentence.

### Connect

```bash
ssh root@195.248.241.251 \
  "docker exec secret-hitler-postgres psql -U secret_hitler -d secret_hitler -c \"…\""
```

Iran dates: `col AT TIME ZONE 'Asia/Tehran'`.

## Goals (do not change in the report)

| Fight | Goal / Iran day | What |
|---|---:|---|
| بازی تمام | **180** | `product_matches` ended, outcome not `abandoned` |
| نشستند | **900** | distinct `user_key` on `seated` |
| رسیدن به ۵ | **350** | lobbies with `reached_5_at` that day |
| قبول دوست | **40** | `friend_requests` **accepted** (`resolved_at`) |
| قبول دعوت میز | **50** | `table_invites` **accepted** (`resolved_at`) |
| نشست شب | **350** | unique `seated` Iran hour 18–23 (`—` before 18:00) |
| برگشت فردا (D1) | **35٪** | yesterday’s sitters who sat again |
| رها (guard) | **< 12٪** | abandoned / (finished + abandoned) |
| پر کردن میز (guard) | **≥ 20٪** | fill invite → sat **that** `room_code` in 30m |

North star is **180 finished games**. Ignore: `bot_start`, subscriber total, blast `reached`, requests **sent**, lobbies opened.

## Report shape

```
Window: <Iran day or today-so-far>  (clock checked)

بازی تمام     … / 180
نشستند        … / 900
رسیدن به ۵    … / 350
قبول دوست     … / 40
قبول دعوت میز … / 50
نشست شب       … / 350
برگشت فردا    …٪ / 35٪

نگهبان
  رها …٪ (سقف 12٪)
  پر کردن میز …٪ (کف 20٪)
```

SQL: `docs/product-analytics.md` → Community fight scoreboard.
Fill conversion: same 30m sat-that-room join as the 6h digest recipe.

## Rules

- Never dump tokens, `DATABASE_URL`, or `.env`.
- Prefer aggregates.
- If events do not cover a full previous day, say D1 is incomplete.
- **DM** = private bot message to one user.
