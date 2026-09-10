# Gamification — making the table speak

The board already has the rules. What it lacks is **ceremony**: a beat
where every player can point at the screen and say “that is what is
happening.” This doc is that layer — timings, who sees what, and how
cards move. Words and voice are in [`ravi.md`](./ravi.md) and
[`ravi-script.md`](./ravi-script.md). Art prompts are in
[`assets-brief.md`](./assets-brief.md).

The Chancellor’s Persian title is locked as **صدراعظم** (English:
Chancellor). Never نخست وزیر.

Most of this only stages [`game-rules.md`](./game-rules.md). Two
**house rules** are locked and *do* differ from the box:

- Discussion is a **5-minute** structured window (President may skip).
- Votes stay **anonymous** after they are counted. The table sees
  Ja / Nein totals, never who cast which ballot.

## The four problems

| # | What players feel today | What the ceremony must do |
|---|---|---|
| 1 | “What am I?” Role is a tiny caption under your seat. Fascists already receive teammate roles in the snapshot, but the UI never *stages* that glance. | Deal (backs fly to seats) → night + private card → night glance, then hide the card. |
| 2 | “What is going on?” Header line + toast. Legislative is a modal only the actor sees; everyone else waits. | Shared animations for every public beat; actor-only hands stay private. |
| 3 | No toys. No card language. No presenter. | On-screen Ravi + big cards + seat bubbles + tracker pawn. |
| 4 | Liberal / Fascist laws look like cropped board art. Votes are two text buttons. | Dedicated policy tiles, role cards, party cards, Ja / Nein cards. |

## Where the original pitch is right

- A **deal** people can watch, then a **private flip** of *your* card.
- Ravi announcing the President, then discussion, then nomination.
- Chat as a **bubble over the seat** (the seat already has a `bubble`
  slot — we just have to feed it).
- President-only nomination styling, with a clear “you pick the
  Chancellor” prompt.
- Failed nomination → tracker advances → presidency passes on.
- Vote as **two huge cards**, then all cards fly to the centre.
- Three anonymous backs sliding from the deck to the President, one
  burning, two sliding to the Chancellor, the enacted law landing in
  the correct well — and the matching **power seal** lighting up.

That last one is the single highest-value animation in the game.

## Locked house rules

### Discussion is five minutes

Locked. Every round opens a **5-minute** talk window
(`DISCUSSION_DURATION_MS = 300_000`). The President may still skip
with `endTurn`. Ravi warns at **30 s** remaining
(`discuss.closing`), then `discuss.ended`.

This is longer than the engine’s current 3 minutes on purpose: the
table is meant to argue, not rush into a nomination.

### Votes stay anonymous

Locked. This is a house rule: the box game flips every ballot so the
table sees who voted Ja and who voted Nein. We do **not**.

Ceremony:

1. Each living player taps a huge Ja or Nein card (private).
2. A **face-down** card flies from their seat to a pile in the centre.
3. When the last vote is in (or the timer hits), the pile is counted
   in the centre — two stacks, or a Ja / Nein tally. No seat is marked.
4. Ravi reads the **totals only**. Then the cards clear.

`hasVoted` may still show that someone has cast (progress), never
*which* card. The server must **not** disclose per-player ballots.

## Still follows the printed game

### The President is not random every round

The first President is chosen at deal. After that the placard moves
**clockwise**, except a Special Election. Ravi should say “این دور
{name} رئیس‌جمهوره,” not “a random player was chosen,” on later rounds.

### “مهره کنگره” is the election tracker

The printed piece is the **شمارندهٔ انتخابات** — three marks. Three
failed governments in a row enact the top law with **no power**, reset
the tracker, and clear term limits. We should animate a pawn / wax
mark sliding to the next pip, not invent a congress token.

### Fifteen seconds is the *look*, not the whole opening

Split the opening:

| Beat | Length | Skip |
|---|---|---|
| Deal (N face-down cards on the table) | ~3 s | no |
| Private look at **your** role + party card + short blurb | **12 s** (max 18) | “فهمیدم” ready |
| Night glance (team / Hitler rules) | **8–10 s** | no (liberals see a closed-eyes wait) |
| First President + “خب، وقت حرف زدنه” | ~4 s | no |

One 15-second dump that also tries to teach Fascists their team will
feel rushed. Ready-up on the private card is important: veterans should
not sit on a locked flip.

### Chat is not always on

Bubbles during **discussion and nomination** only. The printed game
forbids talk during the legislative session; we should mute the input
and not paint bubbles then. Keep bubbles to one short line, ~4 s on
screen, so they do not bury the board.

## Who sees what

| Beat | Everyone | Actor only | Hidden from actor’s teammates |
|---|---|---|---|
| Deal backs | N card backs | — | — |
| Role flip | — | Role art, party art, blurb | Everyone else still sees backs |
| Night, 5–6p | Closed-eyes wait | Fascists **and Hitler** see each other marked | Liberals |
| Night, 7–10p | Closed-eyes wait | Fascists see each other + Hitler (Hitler sees a “raise your hand” self-mark, not the Fascists) | Liberals, and Hitler does not see Fascists |
| Nomination | Ineligible seats dim | Eligible seats pulse + “صدراعظم رو انتخاب کنید” | — |
| Vote pick | — | Two giant cards | — |
| Vote flight | Face-down cards to centre | — | Colour of each ballot |
| Vote count | Ja / Nein **totals** only | — | Who voted which way |
| President draws | 3 backs: deck → President seat | 3 faces in the centre of *their* screen | Colour of the three |
| President burns | 1 back → discard pile | — | Which colour burned |
| Pass to Chancellor | 2 backs → Chancellor seat | Chancellor sees 2 faces | — |
| Enact | Face-up law → correct well | — | — |
| Investigate | “President inspects {name}” | Party card of the target | The party colour |
| Peek | “President looks at the deck” | Top 3, in order | Colours |
| Execute | Seat death animation | — | Role stays hidden |

Same audio for everyone during night. Different picture.

## Ceremony timeline (one round)

```
Night (first round only)
  deal (backs fly to seats, Ravi welcomes the table)
  → night + private look (“خب نقشت رو با دقت ببین”)
  → team glance → day (“خب نقشت رو قایم کن”) → name the President
Discussion          5 min, President may skip
Nomination          30 s  (today: 10 s — too tight)
Vote                25–30 s (today: 30 s, keep)
Vote count          ~3 s, totals only, anonymous
Legislative
  3 backs to President     shared
  President discards 1     15 s  (today: 10 s)
  2 backs to Chancellor    shared
  Chancellor enacts 1      15 s  (today: 10 s)
  enacted law → well       shared
Power (if any)      until used, with a generous timer
Next President      clockwise (or special-election target)
```

Failed nomination or failed vote: tracker pawn advances, Ravi reads the
fail line, presidency passes. Third fail: chaos — top of the deck flips
onto the board **with no power**, tracker resets, term limits clear.

Veto (unlocked at 5 Fascist laws): Chancellor may offer; President
accepts or refuses. Accept → both remaining laws burn, government
**fails**, tracker advances. Refuse → Chancellor must enact one.

## Table toys

**Ravi dock** — cameo portrait (Farid or Dilara) + speech plaque. See
[`ravi.md`](./ravi.md). Idle most of the time; speaking pose only for
a beat. Header still repeats the line for accessibility.

**Header** — Ravi’s subtitle, also fed by `ravi.speak`. Names the
current office-holders.

**Seats**

- President ribbon / Chancellor ribbon (already there).
- Eligible-for-nomination pulse, ineligible grey (President only).
- No vote card on the portrait (ballots stay anonymous).
- Execution: existing `seat-death`, then a black ribbon, no role leak.
- Chat bubble above the portrait, discussion only.

**Your role after the look** — do not leave the full art on the table.
Tuck a small card-back + role colour pip on *your* seat so you can
re-open it as a private sheet. Liberals must not see a Fascist pip on
someone else.

**Boards** — keep the painted tracks. Enacted tiles are the new policy
art, sliding into the well that matches `liberalPolicies` /
`fascistPolicies`. Empty Fascist wells show the **power seal** for that
slot (investigate, special election, peek, execute). When a Fascist law
lands on a powered slot, that seal lifts off the well, flies to the
President, and the power UI opens.

**Deck strip** — draw pile, discard (burned) pile, election tracker
pawn. The three backs that leave the draw pile should actually decrement
the pile count as they travel.

**Ja / Nein** — full-screen pair, huge, one tap. After tap, your screen
can dim to “در انتظار دیگران” plus the progress count. Centre pile stays
face-down until the **count** (totals only).

## Motion rules

Same house rules as [`client/docs/animations.md`](../client/docs/animations.md):

- Only `transform` and `opacity`.
- Named entries in `animations/registry.ts`.
- `animation.enqueue` for multi-step beats so two stories never overlap.
- `will-change` on, then off.
- Reduce Motion: skip motion, **keep** the final picture and the Ravi
  subtitle.

Shared flights (deck → seat, seat → centre, card → well) should be one
element the whole table shares, not a modal. Actor-only faces mount in a
private overlay on top of that flight once the back has arrived.

Prefer 400–700 ms per hop. Spectacle is pacing, not duration.

## Engine / protocol gaps

These are real, not cosmetic:

1. **`Phase.Night` on the server.** `startGame` deals roles (already
   does) then **stays** in Night with a deadline instead of jumping to
   Nomination. The snapshot already carries `you.role` and teammate
   roles via `Room.roleVisibleTo`. The client plays deal / private look /
   night glance off that snapshot and the deadline — it does not assign
   roles locally. When the clock ends, the engine opens discussion.
2. **Anonymous vote resolution** — public snapshot gets Ja / Nein
   *counts* only. Never per-player ballots.
3. **Spectator legislative flights** — public message: “3 drawn, 1
   burned, 2 passed” with no colours. The actor already gets `you.policies`.
4. **Discussion length 5 minutes**, nomination window 30 s, legislative
   window ~15 s.

## Suggested build order

1. Server `Phase.Night` + role overlay / night glance (data from the
   snapshot; motion on the client).
2. Ravi subtitles wired to existing log codes (no audio yet).
3. Ja / Nein cards + centre flight + **anonymous count**.
4. Shared legislative flights + enact-to-well.
5. Tracker pawn + power-seal lift.
6. Pre-recorded Ravi clips for the 10-line pilot, then the rest.

Do not start with voice. The table has to *read* before it can listen.
