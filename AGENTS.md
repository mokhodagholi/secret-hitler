# Secret Hitler — Agent map

Do **not** search or glob the whole repo first. Match the task to the table
below, open those files, then grep **inside that folder**. Deeper docs live in
`docs/` — open one only when the table says so.

`.claude/CLAUDE.md` is a historical design dump (stale tree, unchecked
roadmaps). Skip it unless the user asks. This file is the map.

## What this is

pnpm monorepo: a real-time Secret Hitler game. The **shared** package is the
pure engine (no I/O). The **server** (Fastify + `ws` + Postgres) is the source
of truth. The **client** is Solid.js (signals, not React). **bale-bot** is
the Bale HTTP client the server embeds. Voice/mediasoup is not implemented.

## Packages

| Package | Role | Open first |
|---|---|---|
| `shared/` | Engine, types, WS contracts | `shared/src/engine/GameEngine.ts` |
| `server/` | HTTP, WS, rooms, history, Bale | `server/src/app.ts` |
| `client/` | Solid UI + services | `client/src/App.tsx`, `client/src/services/AppContext.tsx` |
| `bale-bot/` | Bale Bot API client | `bale-bot/src/index.ts` |

## Task → files

| Task | Open |
|---|---|
| Game rules / phase / win / veto / power | `shared/src/engine/phases/` + `shared/src/engine/GameEngine.ts` + `docs/game-rules.md` |
| Role mix / board powers | `shared/src/rules/` |
| Room state, snapshots, role hiding | `shared/src/domain/Room.ts` (`viewFor`) |
| WS / command payload | `shared/src/types/events.ts` + `shared/src/net/clientMessages.ts` |
| HTTP rooms / join / profile | `server/src/http/routes.ts` |
| Socket, timers, reconnect | `server/src/ws/SocketHandler.ts` |
| Live rooms / restart survival | `server/src/rooms/` |
| Finished games / ELO later | `server/src/history/` |
| Bale webhook / seats | `server/src/bale/` + `bale-bot/` |
| Postgres schema / migrate | `server/src/db/` + `server/drizzle/` |
| Screen / route | `client/src/App.tsx` + `client/src/screens/<Name>/` |
| Game table UI | `client/src/screens/GameScreen/` |
| Client services | `client/src/services/` (reached via `AppContext`) |
| Copy / i18n | `client/src/i18n/locales/fa.ts` **and** `en.ts` + `docs/persian.md` |
| Sound | `client/docs/audio.md` + `client/src/services/SoundService.ts` |
| Animation | `client/docs/animations.md` + `client/src/animations/registry.ts` |
| Scrollbars | `client/docs/scroll.md` + `client/src/styles/_mixins.scss` |
| Native feel (not a website) | `client/docs/native-feel.md` + `client/src/styles/global.scss` |
| Ravi narrator | `docs/ravi.md` + `client/src/services/RaviService.ts` |
| Player-facing changelog | `docs/changelog.md` + `client/src/changelog/releases.json` |
| Tests (how to write) | `docs/testing.md` + that package's `test/` |

## Architecture (keep in working memory)

- **Server is source of truth.** Client sends `ClientMessage`s; it never
  applies game rules locally. State arrives as full per-viewer snapshots
  (`Room.viewFor`), not diffs.
- **`GameEngine` is the only mutator of `Room`.** Lobby (join → ready → start)
  lives on the engine. In-game actions go to the current `GamePhase`
  (`handle(playerId, command)`).
- **Commands are a `kind` union**, not command classes
  (`shared/src/types/events.ts`). `parseClientMessage` rebuilds frames
  field-by-field before they reach the engine — never cast raw JSON.
- **Live game stays in memory** (`RoomRepository`). Postgres is required in
  production (`DATABASE_URL`): finished games (`GameHistoryStore`) and live-room
  restore. Tests inject in-memory stores. Never hit the DB mid-round for
  rules.
- **Client stack:** Solid.js functions + class services via `AppContext`.
  Screen switcher is `NavigationService` (no router lib). Co-located
  `.module.scss`; tokens in `client/src/styles/`. Default language is
  **fa** (RTL) — new strings go in both locale files.
- **Sound / animation:** only `SoundService` / `AnimationService`. Callers
  never check settings toggles. Animation keyframes are `transform` /
  `opacity` only.

## Conventions

Open the doc; do not invent a parallel rule.

| Topic | Doc |
|---|---|
| Names | `docs/naming.md` — descriptive words, no 1–2 char aliases |
| Commits | `docs/commit-messages.md` — `type(scope): Capitalized subject` |
| Comments | `docs/comments.md` — why, not what |
| Tests | `docs/testing.md` — rstest, `it('Should …')`, co-located |
| Persian copy | `docs/persian.md` — native fa, never a translation of en |
| Scrollbars | `client/docs/scroll.md` — one mixin, theme via `--scroll-*` |
| Native feel | `client/docs/native-feel.md` — app chrome, not a web page |
| Player-visible feat/fix | `docs/changelog.md` before commit |

`.agents/rules/` files are thin pointers to those docs.

## Commands

```bash
pnpm install
pnpm dev            # shared watch + client + server
pnpm test            # build shared, then every package
pnpm --filter shared test
pnpm --filter server test
pnpm --filter client test

docker compose up -d
cp .env.example .env
pnpm --filter @secret-hitler/server db:generate
pnpm --filter @secret-hitler/server db:migrate
```
