# Testing

How this repo is tested, and the conventions every new test follows. This is
the single source of truth — `.agents/rules/testing.md` is a thin pointer here.

## Runner

Every package uses **rstest** (`@rstest/core`) — a Rspack-native test runner
that shares the project's existing build pipeline (the same plugins as Rsbuild,
so Solid JSX and Sass modules just work). No Vitest, Jest, or Mocha.

```bash
pnpm test                  # build shared, then every package's suite
pnpm --filter shared test  # shared engine only
pnpm --filter server test  # server only
pnpm --filter client test  # client only
```

Each package has an `rstest.config.ts`. The client one additionally sets
`testEnvironment: 'jsdom'` and a `setupFiles` entry.

## Layout

Tests are **co-located** with the code they cover, and shared fixtures live in
a per-package `test/` directory:

```
shared/
  src/engine/GameEngine.ts
  src/engine/GameEngine.lobby.test.ts        ← unit, co-located
  src/engine/GameEngine.election.test.ts
  src/net/clientMessages.test.ts
  test/test-utils.ts                         ← StackedDeck, startGame, …

server/
  src/RateLimiter.ts
  src/RateLimiter.test.ts                     ← unit, co-located
  src/routes.test.ts                          ← HTTP via app.inject
  test/test-utils.ts                          ← buildServer harness, TestClient
  test/ws.integration.test.ts                 ← full socket round, cross-cutting

client/
  src/services/SettingsService.test.ts        ← service unit
  src/screens/GameScreen/GameScreen.test.tsx  ← rendered UI flow
  test/test-utils.tsx                          ← FakeSocket, buildHarness, makeView
  test/setup.ts                                ← jsdom canvas stub, cleanup
```

A single module may have several test files split by area
(`GameEngine.lobby` / `.election` / `.legislative`).

## Conventions

- Test names start with **“Should”**: `it('Should fail a tied election …')`.
  Group related cases under `describe('<unit> — <area>')`.
- Import the API explicitly — `import { describe, expect, it, rs } from
  '@rstest/core'`. There are no injected globals.
- Names are descriptive, the same as production code.

## What each layer tests

### `shared` and `server` — robust behavior

These lock down the rules of the game and the wire protocol; a failing test
here means behavior changed. They cover transitions and edge cases, not just
the happy path:

- election math, tied votes, three-failure chaos enactment, win conditions;
- disconnect mid-vote resolving the election, talking-stick handoff;
- host migration after the grace period;
- role hiding in `viewFor` (fascists see each other, votes stay secret);
- `parseClientMessage` rejecting malformed frames (the exact ones that used to
  crash the socket handler);
- rate limiting and token revocation.

Determinism comes from injection: `PolicyDeck(rng)`, `Room({ deck })`,
`RateLimiter(now)`, `buildServer({ minPlayers })`. The `StackedDeck` helper
serves a fixed tile order so legislative outcomes are exact.

### `client` — user behavior, not implementation

Client tests render a real component tree with `@solidjs/testing-library` and
interact the way a player does — query by role/text, click with `fireEvent` —
then assert on what renders or what the client sent. They never touch timers,
animation frames, or message ordering, which keeps them non-flaky.

The `FakeSocket` (`client/test/test-utils.tsx`) is the seam: a test pushes a
`GameStateView` with `harness.pushState(...)` and reads back the commands the UI
emitted with `harness.socket.lastSent(...)`. `buildHarness({ seated: true })`
seeds a room session so in-room screens mount. `test/setup.ts` stubs the jsdom
2D canvas context (the board renderer needs one) and clears storage between
tests.
