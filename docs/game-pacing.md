# Game pacing — why the table feels too fast

Players report that actions land before the table can follow: a
nomination, a vote, a law, and sometimes a power all blur together.
That read is **correct**. The engine is built for *maximum* windows and
*immediate* hand-offs, not for a shared beat where everyone can point at
the board and say what just happened.

This doc inventories the clocks we ship today, names the real problems
(not just “make timers longer”), and lays out fix options. Ceremony
intent already lives in [`gamification.md`](./gamification.md); this file
is the pacing gap between that intent and the live numbers.

Related product note: root `todo.md` already tracks “make the speed of
game slower … and add a history.”

## Verdict

| Claim | True? | Notes |
|---|---|---|
| Decision windows feel short | **Yes** | Powers especially (15 s). Nomination / legislative are also tight for first-timers. |
| Actions chain with little air | **Yes** | Server advances on the actor’s click; spectators get ~card-flight delay only. |
| Players cannot reconstruct “who / what” | **Yes** | Logs feed Ravi; there is no scrollable in-match history panel. |
| Discussion is the bottleneck | **No** | Discussion is already the long beat (3 min today). Rush is after it. |

So: lengthen the **action** clocks, add **breath between phases**, and
give the table a **readable history** — not one more minute of chat.

## What we ship today

All in-game deadlines live in `shared/src/types/GameState.ts`. The
server (`SocketHandler`) schedules them; phases auto-resolve on
timeout. `RoomOptions.timerEnabled` is stored on create but **never
read by the engine** — timers always run.

| Window | Constant | Today | On timeout |
|---|---|---|---|
| Discussion (per round) | `DISCUSSION_DURATION_MS` | **3 min** | Opens nomination |
| Nomination | `NOMINATION_DURATION_MS` | **25 s** | Election fails, tracker advances |
| Vote (Ja / Nein) | `VOTE_DURATION_MS` | **30 s** | Missing votes count as Nein |
| Legislative choice (P or C) | `LEGISLATIVE_DURATION_MS` | **20 s** | Random discard / enact |
| Card flight before clock | `LEGISLATIVE_DEAL_MS` / `PASS_MS` | ~2.4 s / ~1.7 s | Clock starts after flight |
| Executive power | `SPECIAL_POWER_DURATION_MS` | **15 s** | Random target (or skip peek) |
| Investigate reveal hold | `INVESTIGATION_HOLD_MS` | **10 s** | Next round |
| Opening ceremony | `OPENING_CEREMONY_MS` | ~33 s | First discussion continues |

Client-only holds (do **not** pause the server): chancellor name flash
(~5 s). Seat ballots stay through the legislative window and clear about
two seconds after the enacted law seats on the board.

### Doc vs code drift

[`gamification.md`](./gamification.md) already called for slower action
beats. Live code is closer than the old “10 s” notes, but still short of
the locked ceremony targets:

| Beat | Ceremony target | Live |
|---|---|---|
| Discussion | 5 min | **3 min** |
| Nomination | 30 s | 25 s |
| Vote | 25–30 s | 30 s (ok) |
| Legislative discard / enact | ~15 s each | 20 s choice (ok-ish) after short flight |
| Power | “generous” | **15 s** (tight) |

## Root causes (three layers)

### 1. Decision ceilings are short for the actor

Fifteen seconds to execute, investigate, or call a special election is
barely enough to read the board, especially on phone / Bale Mini App.
Twenty seconds to burn or enact is better, but first tables still
timeout into **random** picks — which feels like the game is playing
itself.

### 2. There is no floor between public beats

As soon as the actor commits, the engine transitions:

```
nominate → Voting (now)
last vote in → Legislative (now)
enact → Power or next Nomination (now)
power used → next Nomination (now)
```

Spectators only get card-travel padding on legislative hand-offs
(`LEGISLATIVE_*_MS`). Vote pass/fail, law land, and power open have
**no server-side breath**. Fast players (and future bots) make the
whole table feel like a conveyor belt.

### 3. Memory is ephemeral

`GameEngine.log` emits `LogCode` events. The client keeps them for
Ravi and a few overlays. Players cannot open a “what happened”
sheet mid-game: who was nominated, how the vote tallied, which colour
landed, who was investigated / executed. After two rushed rounds,
even veterans lose the thread.

Secondary contributors:

- **Timeouts are aggressive.** Random execute / investigate on a
  missed power window is high-stakes chaos.
- **Ravi + overlays can stack** with the next clock if the actor was
  fast.
- **`timerEnabled` is a dead option** — hosts cannot opt into a
  leisurely table without a code change.

## Fix options

Pick by cost and how much “followability” you want. These stack.

### A. Lengthen the action clocks (cheap, high leverage)

Bump constants in `GameState.ts` toward (or past) the ceremony table.
Suggested starting point for a first pass:

| Window | Today | Suggested |
|---|---|---|
| Discussion | 3 min | **5 min** (match `gamification.md`) |
| Nomination | 25 s | **35–40 s** |
| Vote | 30 s | keep, or **35 s** if tables often time out |
| Legislative | 20 s | **30 s** |
| Special power | 15 s | **30–45 s** |
| Investigate hold | 10 s | **12–15 s** (public can absorb the beat) |

Pros: one-file change, tests already assert against the constants.
Cons: does not fix “fast actor → instant next phase.”

### B. Add breath between phases (medium, fixes the conveyor)

Introduce short **server-owned interstitial deadlines** after public
resolutions, before the next decision clock starts. Examples:

| After | Hold | Why |
|---|---|---|
| Vote resolves | 3–5 s | Totals + Ravi land before policies fly |
| Law enacts (no power) | 2–4 s | Tile in the well, then next President |
| Law enacts (with power) | 3–5 s | Seal / prompt before the power UI |
| Power resolves | 2–4 s | Table registers the victim / peek end |
| Failed nomination / vote | 2–3 s | Tracker tick, then next discussion |

Implementation sketch: either a tiny `Phase.Beat` / “announce”
window owned like today’s vote timer, or `openXTimer(delayMs)` style
holds already used for legislative deal/pass. Client ceremony should
*consume* that hold, not invent a longer private one.

Pros: spectators can follow even when veterans play fast.
Cons: needs engine + SocketHandler + UI agreement; bots/tests must
advance through holds.

### C. Softer timeouts (cheap–medium)

Instead of random lethal picks:

- Nomination timeout → fail election (already soft).
- Legislative timeout → keep random discard/enact **or** auto-pick
  the “safest” visible tile with a clear Ravi line (“وقت تموم شد”).
- Power timeout → **skip** investigate / special election / peek;
  for execution, prefer skip or require confirmation rather than a
  random kill.

Pros: missed clocks feel like a stalled government, not a roulette.
Cons: changes strategy slightly (AFK President becomes less dangerous).

### D. In-match history panel (medium, matches the todo)

Persist log entries on the room snapshot (or a ring buffer the client
already has) and expose a **History** sheet on the game menu:

- Round N · {President} nominated {Chancellor}
- Vote · Ja {n} / Nein {m} · passed | failed
- Law · Liberal | Fascist enacted
- Power · investigated / executed / peeked / special election → {name}

Keep vote **totals only** (house rule). Private facts (which tiles
were burned, party colour on investigate for non-President) stay
hidden.

Pros: late joiners and confused seats can catch up without slowing
veterans.
Cons: i18n for every `LogCode`; careful with spoilers.

### E. Pace presets / make `timerEnabled` real (medium)

Three room presets, or revive `timerEnabled` as more than a boolean:

| Preset | Discussion | Action clocks | Breath |
|---|---|---|---|
| Casual (default public / Bale) | 5 min | A’s longer set | B on |
| Standard | 3–4 min | today’s + small bump | short B |
| Blitz | 2 min | today’s or shorter | off |

Wire the flag through `GameEngine` so create-room options actually
change deadlines. Client Settings `timerEnabled` should not be a
silent local toggle if the server ignores it.

### F. Ceremony-first without changing clocks (partial)

Rely only on longer client animations / Ravi. **Do not** treat this as
the fix: the server will still open the next decision under the
overlay, and actors will feel blocked while spectators feel rushed.

Use F only as polish **on top of** A–D.

## Recommended path

1. **Ship A** immediately — discussion 5 min, power ≥ 30 s, legislative
   / nomination bumped. Align `gamification.md` numbers with code.
2. **Add B** for vote → legislative and enact → next (biggest “blink
   and you missed it” gaps).
3. **Ship D** (history sheet) in the same product beat as the todo
   item — pacing + memory together.
4. Soften power timeouts (**C**) once A is in; measure whether random
   executes still happen.
5. Presets (**E**) if public tables and friend tables want different
   speeds.

Success looks like: a new player can narrate the last two governments
without opening Discord, and a power never resolves before the table
has seen the law land.

## Shipped (2026-09)

- Action clocks +15 s (discussion stays **3 min**).
- Server announce breaths sized to mid-game Ravi clips.
- In-match round history sheet (scroll icon; rounds collapsed;
  per-seat votes after close, missing = Nein).

## Still hard to follow — locked product calls

What remains after the ship above:

| Gap | Call |
|---|---|
| History only helps if opened — no always-on “what just happened” | **Later / optional.** Sticky last-beat line is useful but not the next bet. |
| Veterans skip discussion; table jumps to nominate | **Won’t do.** Blocking or flooring skip feels نامردی — President keeps full control of when nomination starts. |
| Mid-game not as ceremonial as opening night | **Not required** for followability. Polish later. |

### Shipped table theater (public actions)

Votes stay **on seats** (large ballots), not a centre pile. Also shipped:

1. Shared legislative flights (3 → burn 1 → 2 → enact).
2. Chaos: top of draw pile flips into the well.
3. Veto agreed: both remaining backs burn to discard.
4. Power seal lifts off the Fascist well → President.
5. Presidency handoff placard (normal + special election).
6. Nomination: ineligible seats dim for everyone.

### Ravi-synced prompts (2026-09)

Choice clocks open after a **prompt hold** sized to the longest Ravi take
for that beat (`NOMINATION_PROMPT_MS` / `VOTE_PROMPT_MS` /
`POWER_PROMPT_MS` from `shared/src/ravi/clipMs.ts`). The UI stays in an
anticipation state until `deadline.startedAt`; then picks unlock. The
header typewriter paces to the active line’s spoken length (live
`audio.duration`, catalog fallback). Adding another voice = measure its
mp3s into the catalog; holds use the max across voices.

## Out of scope here

- Tabletop PDF has no clocks; all timings are house rules.
- Match history on Home (past games) is separate from in-match
  history.
- Tutorial / onboarding pacing is client-scripted; see
  [`onboarding.md`](./onboarding.md).
- Forcing a discussion minimum / skip lock — rejected (نامردی).

## Pointers

| Concern | Code |
|---|---|
| Duration constants | `shared/src/types/GameState.ts` |
| Ravi clip catalog / prompt holds | `shared/src/ravi/clipMs.ts` |
| Open / resolve deadlines | `shared/src/engine/GameEngine.ts` |
| Phase timeouts | `shared/src/engine/phases/*` |
| Announce breaths | `BREATH_AFTER_*` + `pendingBreath` / `SocketHandler` |
| Server `setTimeout` wiring | `server/src/ws/SocketHandler.ts` |
| Ceremony targets | `docs/gamification.md` |
| Log codes → Ravi | `client/src/screens/GameScreen/RaviNarrator.tsx` |
| Header typewriter | `client/src/screens/GameScreen/TypewriterText.tsx` |
| Client log buffer | `client/src/services/GameStateService.ts` (`logEntries`) |
| Round history UI | `client/src/screens/GameScreen/RoundHistoryModal.tsx` |
| Legislative flights | `client/src/screens/GameScreen/LegislativeModal.tsx` |
