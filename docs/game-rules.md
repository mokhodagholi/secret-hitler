# Game Rules & Round Flow

The canonical Secret Hitler rules (from the official rulebook, `Secret-Hitler.pdf`)
plus how this implementation structures a round. Reference:
[Secret Hitler (whitesho.com)](https://whitesho.com/SecretHitlerGame).

## Players & roles

- **5–10 players.** Each is secretly a **Liberal**, a **Fascist**, or **Hitler**
  (Hitler is a Fascist with a hidden identity).
- Role counts by player count:

  | Players | Liberals | Fascists (excl. Hitler) | Hitler |
  |---|---|---|---|
  | 5 | 3 | 1 | 1 |
  | 6 | 4 | 1 | 1 |
  | 7 | 4 | 2 | 1 |
  | 8 | 5 | 2 | 1 |
  | 9 | 5 | 3 | 1 |
  | 10 | 6 | 3 | 1 |

- At setup the Fascists learn each other and Hitler. With **5–6 players** Hitler
  also sees the Fascists; with **7+** Hitler does not.
- Only liberal and fascist policy cards exist (no special-power card types).

## A round

1. **Discussion** — players talk. In this app discussion is turn-based: a
   talking stick passes to each player for a fixed window (`SPEAKING_TURN_MS`,
   20s); only the current speaker may chat, everyone else watches.
2. **Nomination** — the President (rotates clockwise each round) nominates an
   eligible player as Chancellor.
3. **Election (vote)** — every living player votes Ja/Nein at the same time. A
   strict majority of Ja elects the government. In this app voting is a timed
   prompt: not voting before the timer expires counts as **Nein**.
4. **Legislative session** (only if elected):
   - The President draws **3** policies and **discards 1** (face down).
   - The Chancellor receives the remaining **2** and **enacts 1**.
   - The enacted policy goes on the board; the other is discarded. Hands are
     private and the President and Chancellor may not communicate during this
     step.
5. The presidency passes to the next living player by seat and a new round
   begins.

## Eligibility (term limits)

- The **last elected Chancellor** is not eligible to be nominated again next
  round. With more than 5 players the **last elected President** is also
  ineligible. The current President is never eligible as their own Chancellor.

## Failed elections & the election tracker

- Each failed vote advances the **election tracker** by one. After **3**
  consecutive failed governments the country falls into chaos: the **top policy
  is enacted automatically**, the tracker resets, and term-limit restrictions
  clear.

## Win conditions

- **Liberals win** when **5 liberal** policies are enacted, **or** Hitler is
  executed.
- **Fascists win** when **6 fascist** policies are enacted, **or** Hitler is
  elected Chancellor once **3 or more fascist** policies are on the board.

## Presidential powers (standard rules — not implemented here)

In the full game, enacting certain fascist policies grants the President a
one-time power, used before the next round: **Investigate Loyalty**, **Call
Special Election**, **Policy Peek**, and **Execution**. The unlock thresholds
depend on player count. This implementation intentionally omits these for now —
play is liberal/fascist policies only.

## Implemented vs. planned

Implemented: lobby, role dealing, talking-stick discussion, nomination, voting,
the 5/6-policy and Hitler-Chancellor win conditions, the election tracker and
chaos rule.

Planned / not yet done: the legislative card session (draw 3 / discard / enact)
in the current phase-machine engine, the timed voting screen, presidential
powers, veto power (unlocks after 5 fascist policies), term limits, and the
Hitler-execution liberal win.

## Dev notes

- Minimum players to start is env-configurable: `MIN_PLAYERS=3 pnpm dev:server`
  (production keeps the standard 5). See `.env.example`.
- The server is authoritative; clients send commands and render the broadcast
  `GameStateView`.
