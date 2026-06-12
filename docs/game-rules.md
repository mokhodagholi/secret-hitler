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

- **Knowledge at setup:** the Fascists learn each other and who Hitler is. In a
  **5–6 player** game Hitler also learns who the Fascists are; in a **7–10**
  player game Hitler does **not** know the Fascists.

## A round

1. **Discussion** — players talk. In this app discussion is turn-based: a
   talking stick passes to each player for a fixed window (`SPEAKING_TURN_MS`,
   20s); only the current speaker may chat.
2. **Nomination** — the President (rotates clockwise each round) nominates an
   **eligible** player as Chancellor (see term limits below).
3. **Election (vote)** — every living player votes Ja/Nein. A strict majority of
   Ja elects the government. Voting is time-boxed (`VOTE_DURATION_MS`, 30s);
   not voting before the timer expires counts as **Nein**. If the elected
   Chancellor is Hitler once **3+ fascist** policies are enacted, the Fascists
   win immediately.
4. **Legislative session** (only if elected):
   - The President draws **3** policies and **discards 1** (face down).
   - The Chancellor receives the remaining **2** and **enacts 1** (or vetoes —
     see below). Hands are private; the President and Chancellor may not
     communicate during this step.
5. **Executive action** — if the policy just enacted is on a fascist board slot
   that grants a power, the President must use it before the next round.
6. The presidency passes to the next living player by seat and a new round
   begins.

When the draw pile has fewer than 3 cards, the discard pile is shuffled back in.

## Term limits (nomination eligibility)

The **last elected Chancellor** may not be nominated as Chancellor. With **more
than 5 living players** the **last elected President** is also ineligible. The
sitting President can never nominate themselves. These restrictions reset when a
policy is enacted through the chaos rule (three failed elections).

## Failed elections & the election tracker

Each failed vote advances the **election tracker** by one. After **3**
consecutive failed governments the country falls into chaos: the **top policy is
enacted automatically** (no power is granted), the tracker resets, and term-limit
restrictions clear.

## Fascist board powers (executive actions)

Each fascist policy slot may grant the President a one-time power when a fascist
policy lands on it. The layout depends on the player count:

| Fascist policy # | 5–6 players | 7–8 players | 9–10 players |
|---|---|---|---|
| 1 | — | — | Investigate |
| 2 | — | Investigate | Investigate |
| 3 | Policy Peek | Special Election | Special Election |
| 4 | Execution | Execution | Execution |
| 5 | Execution | Execution | Execution |
| 6 | **Fascist win** | **Fascist win** | **Fascist win** |

The powers:

- **Investigate Loyalty** — the President sees a chosen player's **party
  membership** (Liberal or Fascist; Hitler's card reads Fascist). Each player may
  be investigated only once.
- **Call Special Election** — the President picks any other player to be the next
  President. Afterwards the rotation resumes from the player to the special
  President's left (i.e. ordinary order continues from the original seat).
- **Policy Peek** — the President secretly looks at the top 3 policies in the
  draw pile.
- **Execution** — the President kills a player, who is removed from the game and
  reveals nothing. If the executed player is **Hitler, the Liberals win
  immediately**.

## Veto power

Once **5 fascist policies** are enacted, a veto unlocks. During the legislative
session the Chancellor may propose to veto the two policies in hand; if the
President agrees, both are discarded and the government counts as failed (the
election tracker advances). If the President refuses, the Chancellor must enact
one of the two as usual.

## Win conditions

- **Liberals win** when **5 liberal** policies are enacted, **or** Hitler is
  executed.
- **Fascists win** when **6 fascist** policies are enacted, **or** Hitler is
  elected Chancellor once **3 or more fascist** policies are on the board.

## Implementation status

Implemented: lobby with ready-up, role dealing, talking-stick discussion,
nomination, the timed voting screen, the legislative session (draw 3 / discard /
enact), the election tracker and chaos rule, and the 5/6-policy and
Hitler-Chancellor win conditions. Driven by the `GamePhase` state machine
(`shared/src/engine/phases/`).

In progress (this milestone): Hitler-knows-Fascists in 5–6 player games, term
limits, the four executive powers with the per-player-count board layout,
Hitler-execution liberal win, and the veto power.

## Dev notes

- Minimum players to start is env-configurable: `MIN_PLAYERS=3 pnpm dev:server`
  (production keeps the standard 5). See `.env.example`.
- The server is authoritative; clients send commands and render the broadcast
  `GameStateView`.
