---
name: data-assis
description: >-
  Answers live product/analytics questions from production Postgres and explains
  funnel, lobby-fill, digests, blasts, and audience metrics. Use when the user
  runs /data-assis or asks for VPS data, metrics, retention, invite results,
  funnel, subscribers, or support-group digest numbers.
disable-model-invocation: true
---

# Data assistant

Live product data for Secret Hitler. Source of truth for recipes and tables:
[`docs/product-analytics.md`](../../../docs/product-analytics.md).

Related (open only when needed):

- Lobby-fill DMs: [`docs/lobby-fill.md`](../../../docs/lobby-fill.md)
- Schema: `server/src/db/schema.ts`
- Digest code: `server/src/product/ProductDigestService.ts`

## Workflow

1. Read `docs/product-analytics.md` (connect + intent map + recipes).
2. Match the ask to a table/recipe. Do not invent metrics.
3. Query production via SSH + `docker exec` psql (never print secrets / `.env`).
4. Prefer aggregates; drill into a `user_key` only when asked.
5. Report: **window + timezone** → numbers → **one** takeaway sentence.
6. Iran times: `col AT TIME ZONE 'Asia/Tehran'`. Confirm `SELECT NOW();` if unsure.

### Connect

```bash
ssh root@195.248.241.251 \
  "docker exec secret-hitler-postgres psql -U secret_hitler -d secret_hitler -c \"…\""
```

## Intent shortcuts

| Ask | Start with |
|---|---|
| Funnel / demand | `product_events` (`miniapp_auth`, `seated` — not raw `bot_start`) |
| Lobby fill ROI | `lobby_fill_invite` / `_fail` / `_wave` + sat-that-room join |
| Why empty lobbies | `product_lobbies` death_reason + peak seats |
| Match health | `product_matches` outcomes |
| Audience | `bot_subscribers` (+ note blockers drop) |
| Blast ROI | `product_blasts` + recipients opened/sat |
| User X timeline | `product_events` by `user_key` + `bot_subscribers` |
| Digest-shaped window | Same blocks as the support-group digest (people → lobby → fill → games) |

## Lobby-fill anti-spam (quick)

Warm lookback **6h** (`find_match` > `seated`/`miniapp_auth`). Skip: busy, finished game **30m**, fill invite **12h**, cold `/start` only. Max **3**/wave, **400ms** gap. Details in `lobby-fill.md`.

## Digest

Bot posts to support chat every **6h** Iran (00/06/12/18). Cadence: `PRODUCT_DIGEST.intervalMs` (plan → 24h). Shape is in `product-analytics.md` → Support-group digest.

## Rules

- Never dump tokens, `DATABASE_URL`, or `.env`.
- Never run destructive SQL unless the user explicitly asks.
- If a metric was not shipped yet, say so.
- **DM** = private bot message to one user.
