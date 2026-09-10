# Sound effects — the table’s physical voice

Ravi already **says** what happened. This layer is the **object** that
happened: a card sliding, a wax stamp, a wooden pawn, a gavel. Players
should hear the table even with Ravi Voice off.

Spoken lines stay in [`ravi-script.md`](./ravi-script.md). Playback
rules for the SFX toggle live in
[`client/docs/audio.md`](../client/docs/audio.md). This doc is the
catalog of *which* one-shots to bake, *when* they fire, and *how* to
make the files. Hits that must start on the same frame as a named
animation (shorter, dry foley) are
[`animation-sounds.md`](./animation-sounds.md).

## Two layers (locked)

| Toggle | What it is | Owner |
|---|---|---|
| **Ravi Voice** | Scripted Persian lines. Subtitles always run. | `RaviService.speak` |
| **Sound Effects** | Table physics + UI punctuation. No words. | `SoundService.play` |
| **Music** | Looping bed. Catalog in [`background-music.md`](./background-music.md). | `SoundService.playMusic` |

Do **not** put speech in an SFX file. Do **not** put a card slide in a
Ravi clip. If both fire on the same beat, the SFX starts with the
motion and Ravi speaks over (or just after) it.

Same SFX for every seat. Night must not leak who is Fascist by playing
a different sound on another phone.

## What we already have

| Key | File | Status |
|---|---|---|
| `swap-page` | `client/src/assets/sounds/effects/swap-page.mp3` | Wired on every screen change |
| Ravi catalog | `client/src/assets/sounds/ravi/{farid,daniel,dilara}/` | Spoken lines, not SFX |

Everything else in this doc is **missing**. Animations already exist
(`badge-pop`, `card-flip-in`, `seat-death`, `shake`, `policy-reveal`,
`placard-present`, …) — they play silently.

Several Ravi clips are already on disk but **not spoken** yet
(`discuss.ended`, `nominate.timeout`, `vote.count`, `vote.collecting`,
`chaos.enacted`, `law.burned`, `law.presidentChoosing`,
`law.chancellorChoosing`, `law.vetoUnlocked`, `power.peekDone`,
`president.special`, `deal.look`). Wire those lines in `RaviNarrator`
— do not invent an SFX to replace a missing sentence.

## Locked sound

- **One signature per clip.** Card events are paper. Clocks are clocks.
  President is a brass desk bell. Execution is a funeral bell. Liberal
  and Fascist laws are a card landing on the board. Liberal win is adult
  piano and strings. Fascist win is a darker organ. Burned policy is fire.
  **Saxophone is only `government-rejected`.**

Export: **mono mp3, 96 kbps**, loudness **−20 LUFS**, true peak
**−1.5 dB**, ~50 ms pad at head and tail. Quieter than Ravi (−16 LUFS)
so the host stays in front.

Files live in `client/src/assets/sounds/effects/{id}.mp3`. The
`SoundService` key is the filename without `.mp3`.

## How to create a clip

Three ways, same prompts. The bake script is the one we commit.

### 1. Bake script (preferred)

Needs `ELEVENLABS_API_KEY` and `ffmpeg` on `PATH`.

```bash
# Pilot (highest-value table beats)
python3 scripts/generate-sound-effects.py --ids deal-slide,card-flip,president-seal,chancellor-seal,ballot-tap,government-elected,government-rejected,tracker-tick,law-liberal,law-fascist,execute-strike,win-liberal,win-fascist,role-cascade

# One clip after a prompt change
python3 scripts/generate-sound-effects.py --ids tracker-tick

# Whole catalog
python3 scripts/generate-sound-effects.py
```

The script calls ElevenLabs **Sound Generation** (text → SFX, not TTS),
normalizes with ffmpeg, and writes into `effects/`. Listen on a phone
speaker. If it sounds like a video-game power-up, change the prompt
and re-bake that id — do not ship it.

### 2. ElevenLabs UI (no script)

[Sound Effects](https://elevenlabs.io/app/sound-effects) → paste
**only** the prompt in the table below → duration from the **Dur**
column → download → rename to `{id}.mp3` → drop in `effects/`.

Then still run ffmpeg so loudness matches the rest:

```bash
ffmpeg -y -i raw.mp3 \
  -af "adelay=50:all=1,apad=pad_dur=0.05,loudnorm=I=-20:TP=-1.5:LRA=8" \
  -ac 1 -b:a 96k \
  client/src/assets/sounds/effects/{id}.mp3
```

### 3. Foley (gold standard)

Record the real object, same filenames. A playing-card slide on a
wooden table, a rubber stamp on paper, a chess pawn on wood. Then the
same ffmpeg line. Do not mix a foley clip with an AI take of a
*different* object in the same set — the table should feel like one room.

Reject: letters spoken in the file, modern UI clicks, risers that
never hit, anything that would play differently for Liberals vs
Fascists.

## Wiring (after the file exists)

1. Import and register in `SoundService` `EFFECTS`.
2. Call `sound.play('key')` from the same place the animation starts —
   usually a `createEffect` on `GameScreen` / the overlay, or the
   handler that already calls `ravi.speak`.
3. Volume in the registry: **0.45–0.7**. Hits sit under Ravi.
   Stings (`win-*`, `chaos-hit`) may go to **0.75**.

```ts
import trackerTickUrl from '../assets/sounds/effects/tracker-tick.mp3';

const EFFECTS = {
  'swap-page': { src: swapPageUrl, volume: 0.6 },
  'tracker-tick': { src: trackerTickUrl, volume: 0.55 },
};
```

Reduce Motion skips the *animation*, not the SFX. The beat still
happened.

## What not to sonify

These would make the table noisy or leak information.

| Skip | Why |
|---|---|
| Every button / nav tap | `swap-page` is enough. Extra clicks fight Ravi. |
| Chat send / bubble | Discussion is talk. Don’t score it. |
| Per-second timer ticks | The 30 s discussion warn is enough. |
| Different night SFX per role | Phones on one sofa would leak the team. |
| Who voted Ja / Nein | Ballots stay anonymous. One shared tally sound. |
| Colour of a burned / drawn law | Private hands stay silent on colour. |
| Settings toggles, rules pages | No ceremony. |

---

## Catalog

**Who** is who hears it. **Ravi** is the line that already exists on
that beat (do not replace it). **Play on** is the client moment to
hook. **P** is build order: **0** = pilot, **1** = rest of the table,
**2** = lobby / chrome.

Durations are the bake target, not a hard trim.

### A. Menus & lobby

Screens: `home`, `play` / `create-room` / `join-game`, `waiting-room`,
`settings`, `rules`, `how-to-play`.

| Id | P | When | Who | Suggested effect | Dur | Ravi |
|---|---|---|---|---|---|---|
| `swap-page` | — | Any `nav.navigate` | Everyone | Exists: short paper-page turn. Keep. | ~0.3 | — |
| `player-join` | 2 | A seat fills in the waiting room | Lobby | Soft wooden chair pulled in, one short scrape. Not a doorbell. | 0.6 | — |
| `player-leave` | 2 | Seat empties (leave / kick) | Lobby | Chair scrape away, slightly duller than join. | 0.5 | — |
| `player-ready` | 2 | A player toggles ready | Lobby | Small wax blot / stamp on a card, high and dry. | 0.35 | — |
| `room-start` | 1 | Host starts; phase leaves `lobby` | Lobby → board | Wooden gavel once, then a brief paper shuffle. Hands the table to Night. | 1.0 | then `deal.start` |
| `ui-error` | 2 | Start blocked (need players / not ready), copy failed | Actor | Low muted knock on wood. Same as a rejected action, not an alarm. | 0.4 | — |
| `ui-copied` | 2 | Share link copied | Actor | Tiny paper tear / slip. Optional; skip if it feels cheap. | 0.25 | — |
| `room-closed` | 2 | `RoomClosedNotice` — kicked or host left | Actor | Same family as `ui-error`, slightly heavier knock. One clip for both reasons; the dialog is the words. | 0.5 | — |

### B. Night & private role (`NightOverlay`)

Deal backs fly to seats (~10 s) → private look (12 s) → team glance
(~9 s) → day + first President.

| Id | P | When | Who | Suggested effect | Dur | Ravi |
|---|---|---|---|---|---|---|
| `deal-slide` | 0 | Each face-down card leaves the pile for a seat | Everyone | Thick playing-card sliding across wood. Dry, close. Play **once per seat**, ~250 ms apart, overlapping allowed. | 0.45 | under `deal.start` |
| `night-fall` | 1 | Look beat opens, veil down | Everyone | Soft bakelite radio hush / velvet cloth over the table. No choir. | 0.9 | with `night.start` |
| `card-flip` | 0 | Private role + party cards turn face-up | Actor (look overlay) | Cardstock flip, one slap of paper. Same clip if we later flip vote / policy faces. | 0.5 | under `private.you*` |
| `glance-tick` | 1 | Glance beat starts | Everyone, **same file** | Very short low wood tick — “eyes closed / look around” cue. Must be identical for Liberal and Fascist devices. | 0.4 | under `private.night*` |
| `night-lift` | 1 | Ceremony ends, overlay closes | Everyone | Cloth lifted, room air returns. Inverse of `night-fall`. | 0.7 | with `night.end` |

### C. Offices (President / Chancellor)

Screens: `NightOverlay` finish, `RaviNarrator` president change,
`ChancellorReveal`, `TableSeat` badge.

| Id | P | When | Who | Suggested effect | Dur | Ravi |
|---|---|---|---|---|---|---|
| `president-seal` | 0 | Placard lands on the President seat (first President, clockwise pass, **or** special-election result) | Everyone | Heavy wooden desk placard set down + a gold-stamp tap. Weight. | 0.7 | with `president.first` / `president.next` / `president.special` |
| `chancellor-seal` | 0 | `ChancellorReveal` opens (nomination → voting) | Everyone | Same family as president, lighter oak, slightly higher. The “this government is on the table” hit. | 0.65 | after `nominate.named*` |
| `nominate-timeout` | 1 | President did not pick in time | Everyone | Muted wood thud, no gavel. Failed motion, not a vote fail. | 0.5 | with `nominate.timeout` |

Do not play `president-seal` again on every discussion reopen if the
same person still holds the office — only when `board.president`
changes (and once at first naming).

### D. Discussion (`Nomination` phase, 5-minute window)

| Id | P | When | Who | Suggested effect | Dur | Ravi |
|---|---|---|---|---|---|---|
| `discuss-open` | 1 | Discussion window starts | Everyone | Soft gavel rest, not a full strike. “You may talk.” | 0.45 | with `discuss.start` |
| `discuss-warn` | 1 | 30 s left | Everyone | Two quiet clock ticks, wood case, no digital beep. | 0.8 | with `discuss.closing` |
| `discuss-close` | 1 | Timer ends or President skips | Everyone | Single firm gavel. Talk is over. | 0.5 | with `discuss.ended` |

### E. Voting (`VotingOverlay`)

House rule: ballots stay **anonymous**. SFX must not encode Ja vs Nein
on the public table.

| Id | P | When | Who | Suggested effect | Dur | Ravi |
|---|---|---|---|---|---|---|
| `ballot-tap` | 0 | You tap Ja **or** Nein | Actor only | Same clip for both cards: a large card slapped onto felt. Choice is the picture, not the sound. | 0.35 | after `private.vote` |
| `ballot-slide` | 1 | A face-down ballot flies seat → centre | Everyone | Thin card sliding, slightly different from `deal-slide` (shorter, lighter). May overlap as votes come in. | 0.4 | optional `vote.collecting` |
| `vote-tally` | 1 | Pile is counted, totals shown | Everyone | Paper stack being squared on the table, then one tap. | 0.8 | with `vote.count` |
| `government-elected` | 0 | Strict Ja majority | Everyone | Firm gavel + wax stamp. The government stands. | 1.0 | with `vote.passed` |
| `government-rejected` | 0 | No majority (tie fails) | Everyone | Lonely falling saxophone. Pair with the existing `shake` on the board. | 3.2 | with `vote.failed` |

Hitler-elected-Chancellor is a **win**, not a vote SFX — use
`win-fascist` with `vote.hitlerChancellor`.

### F. Election tracker & chaos

| Id | P | When | Who | Suggested effect | Dur | Ravi |
|---|---|---|---|---|---|---|
| `tracker-tick` | 0 | `electionTracker` increases (1 or 2) | Everyone | Small walnut pawn sliding to the next pip. Wood-on-wood, one move. | 0.55 | with `tracker.advance` |
| `chaos-hit` | 1 | Third failure; chaos begins | Everyone | Low piano-string / cabinet thud, short and grave. Not an explosion. | 1.4 | with `chaos.start` |
| `chaos-enact` | 1 | Top deck law flips onto the board (no power) | Everyone | Card slapped down hard, then the matching `law-*`. | 0.6 | with `chaos.enacted` |

### G. Legislative session

Shared flights: 3 backs to President → burn 1 → 2 backs to Chancellor
→ enact. Actor-only faces stay private; SFX is the **backs**.

| Id | P | When | Who | Suggested effect | Dur | Ravi |
|---|---|---|---|---|---|---|
| `policy-draw` | 1 | Three backs leave the draw pile | Everyone | Three-card deal in one clip (or play `deal-slide` ×3). Prefer one clip so it does not fight `law.draw`. | 1.0 | with `law.draw` |
| `policy-flip` | 1 | Actor’s hand cards flip face-up | Actor | Reuse `card-flip` (or a slightly heavier take). | 0.5 | `private.discard` / `private.enact` |
| `policy-burn` | 1 | Discarded back lands on the burn pile | Everyone | Paper dropped onto a discard stack. Dry. No fire crackle (reads as joke). | 0.5 | with `law.burned` |
| `policy-pass` | 1 | Two backs travel to the Chancellor | Everyone | Two-card slide, shorter than `policy-draw`. | 0.7 | with `law.pass` |
| `law-liberal` | 0 | Liberal law hits the well (`PolicyRevealOverlay`) | Everyone | Bright wax seal stamp on cream paper, hopeful, not fanfare. | 0.9 | with `law.liberal` |
| `law-fascist` | 0 | Fascist law hits the well | Everyone | Heavier crimson wax stamp, darker wood. Same *shape* as liberal, darker *colour*. | 0.95 | with `law.fascist` |
| `veto-offer` | 1 | Chancellor proposes veto | Everyone | Two gloves / two stamps hovering — a held ink stamp, not a hit yet. | 0.6 | with `law.vetoOffered` |
| `veto-agree` | 1 | President accepts; both remaining burn | Everyone | Double stamp + two `policy-burn` energy. | 1.0 | with `law.vetoAgreed` |
| `veto-refuse` | 1 | President refuses | Everyone | Stamp pulled back, wood tap. Then Chancellor must enact. | 0.55 | with `law.vetoRejected` |
| `veto-unlock` | 1 | Fifth Fascist law; veto is now legal | Everyone | Metal latch / cabinet bolt sliding open. | 0.8 | with `law.vetoUnlocked` |

### H. Executive powers (`PowerPanel`, `InvestigateOverlay`)

| Id | P | When | Who | Suggested effect | Dur | Ravi |
|---|---|---|---|---|---|---|
| `seal-open` | 1 | Fascist well seal lifts to the President; `SpecialPower` opens | Everyone | Wax seal peeling off wood, short. One clip for all four powers — the *kind* of power is Ravi’s line. | 0.7 | with `power.investigate` / `peek` / `specialElection` / `execution` |
| `party-slide` | 1 | Membership card flies seat → centre | Everyone | Heavier pass-card slide than a ballot. | 0.7 | — |
| `party-flip` | 1 | President sees the party face | President only | Reuse `card-flip`. Party colour is the picture + whispered Ravi, not a different SFX. | 0.5 | `power.investigatedLiberal` / `Fascist` |
| `peek-flip` | 1 | Top-three peek cards flip for the President | President | Three light flips; can be `card-flip` with overlap. | 0.9 | with `power.peek` |
| `peek-done` | 1 | Peek cards return to the draw pile | Everyone | Three backs sliding back onto the deck, reverse of `policy-draw`. | 0.7 | with `power.peekDone` |
| `execute-strike` | 0 | Target chosen; `seat-death` plays | Everyone | Formal: empty chair, mourning-ribbon cloth, one low wood hit. **No** gun, blade, scream, or body. | 0.9 | with `power.executed` |
| `you-died` | 1 | `YouDiedOverlay` opens | Victim only | Same family as `execute-strike`, closer and duller — as if the hit landed on this device. | 0.8 | with `power.executedYou` |

Hitler executed → `win-liberal` with `power.hitlerExecuted`, not a
second death hit.

### I. Game over (`GameOverOverlay`)

| Id | P | When | Who | Suggested effect | Dur | Ravi |
|---|---|---|---|---|---|---|
| `win-liberal` | 0 | Liberals win (5 laws **or** Hitler executed) | Everyone | Short brass-and-wood resolution, dawn, 2 s max. Not a sports jingle. | 2.2 | `game.liberalsWin.policies` or `power.hitlerExecuted` |
| `win-fascist` | 0 | Fascists win (6 laws **or** Hitler elected Chancellor) | Everyone | Darker low-string / cabinet close. Same length as liberal so the pair feels like one set. | 2.2 | `game.fascistsWin.policies` / `vote.hitlerChancellor` |
| `role-cascade` | 0 | Role list starts staggering in | Everyone | One card-flip per row would be noisy. One **shuffle + flip** sting as the cascade begins. | 1.1 | with `game.reveal` |

---

## Suggested play order on busy beats

SFX is punctuation. If two clips would overlap, keep the **object**
and let Ravi take the sentence.

| Beat | Order |
|---|---|
| First President | `president-seal` → `president.first` |
| Chancellor named | `chancellor-seal` during `ChancellorReveal` → `vote.start` when it closes |
| Failed government | `government-rejected` → `tracker-tick` → `president-seal` (next) |
| Chaos | `government-rejected` → `chaos-hit` → `chaos-enact` → `law-*` |
| Enact + power | `law-fascist` → `seal-open` → power Ravi line |
| Execution | `execute-strike` (with `seat-death`) → `power.executed` |
| Game over | win sting → `game.reveal` → `role-cascade` |

`SoundService` already clones overlapping one-shots, so `deal-slide` ×
N is fine. Do not overlap two **stings** (`win-*`, `chaos-hit`).

## Pilot (bake these first)

Listen on a phone, in a room with Ravi Voice **on** and then **off**.

1. `deal-slide`
2. `card-flip`
3. `president-seal`
4. `chancellor-seal`
5. `ballot-tap`
6. `government-elected`
7. `government-rejected`
8. `tracker-tick`
9. `law-liberal`
10. `law-fascist`
11. `execute-strike`
12. `win-liberal`
13. `win-fascist`
14. `role-cascade`

If the table already feels like a room, batch the rest. If it feels
like a notification drawer, rewrite prompts before adding lobby chrome.

## Paste-ready prompts

Copy **one** prompt. Do not prepend a style bible. Do not mention the
game name, Hitler, fascism, guns, or screams.

Shared prefix (the script prepends this; in the UI, include it):

```
1930s Weimar jazz club and wooden cabinet table. Intimate analog recording,
warm small-room reverb, faint vinyl crackle. Musical color is wanted:
saxophone, clarinet, felt piano, muted brass. Not a video-game UI click.
```

| Id | Dur | Prompt (after the prefix) |
|---|---|---|
| `player-join` | 0.6 | A wooden chair pulled once across a hardwood floor, short scrape, then silence. |
| `player-leave` | 0.5 | A wooden chair scraped backward once, duller and quieter than a sit-down. |
| `player-ready` | 0.35 | A small rubber stamp pressed once onto thick cardstock. Dry ink, no echo. |
| `room-start` | 1.0 | One wooden gavel tap on a desk, then a brief shuffle of a few playing cards. |
| `ui-error` | 0.4 | A knuckle knocking twice softly on a wooden desk, muted, no boom. |
| `ui-copied` | 0.25 | A small slip of paper torn once, very short. |
| `room-closed` | 0.5 | A knuckle knocking three times on a wooden door, muted, then silence. |
| `deal-slide` | 0.45 | One thick playing card sliding across a polished wooden table, close mic, paper-on-wood. |
| `night-fall` | 0.9 | A heavy velvet cloth settling over a table, soft air, faint bakelite radio hiss dying out. |
| `card-flip` | 0.5 | A single playing card flipped face-up onto wood, crisp paper slap. |
| `glance-tick` | 0.4 | One quiet tick of a wooden mantel clock. |
| `night-lift` | 0.7 | Velvet cloth lifted off a table, air returns, very short. |
| `president-seal` | 0.7 | A heavy wooden desk placard set down, then a brass wax-stamp tapped once. |
| `chancellor-seal` | 0.65 | A lighter oak desk placard set down with a smaller brass stamp tap. |
| `nominate-timeout` | 0.5 | A dull wooden thud, as if a gavel was set down unused. |
| `discuss-open` | 0.45 | A wooden gavel rested gently on its desk, not a full strike. |
| `discuss-warn` | 0.8 | Two ticks of a wooden desk clock, close, no chime. |
| `discuss-close` | 0.5 | One firm wooden gavel strike on a desk. |
| `ballot-tap` | 0.35 | A large ballot card slapped onto felt, same for yes or no. |
| `ballot-slide` | 0.4 | A thin card sliding a short distance on wood. |
| `vote-tally` | 0.8 | A small stack of cards squared on a table, then one tap to settle them. |
| `government-elected` | 1.0 | A firm gavel strike and a wax seal stamped onto paper. |
| `government-rejected` | 0.7 | A low wooden thud and a short rattle of a table, no smash. |
| `tracker-tick` | 0.55 | A small walnut chess-like pawn sliding one square on wood. |
| `chaos-hit` | 1.4 | A low piano-string hit inside a wooden cabinet, grave, short decay, no explosion. |
| `chaos-enact` | 0.6 | A law card slapped hard onto a wooden board. |
| `policy-draw` | 1.0 | Three playing cards dealt in a row onto wood, fast, one take. |
| `policy-burn` | 0.5 | A card dropped onto a discard pile, paper on paper. No fire. |
| `policy-pass` | 0.7 | Two cards sliding together across a table. |
| `law-liberal` | 0.9 | A bright wax seal stamped onto cream paper, hopeful, wooden desk. |
| `law-fascist` | 0.95 | A heavy dark wax seal stamped onto paper, same gesture as a bright stamp but darker and weightier. |
| `veto-offer` | 0.6 | A wax stamp hovering and tapping the table once without pressing. |
| `veto-agree` | 1.0 | Two wax stamps pressed onto a document, then paper discarded. |
| `veto-refuse` | 0.55 | A wax stamp lifted away, then a short wood tap. |
| `veto-unlock` | 0.8 | A metal cabinet bolt sliding open, short. |
| `seal-open` | 0.7 | A wax seal peeled off wood, short crackle of wax, no smash. |
| `party-slide` | 0.7 | A thick identity-pass card sliding from a seat onto the table centre. |
| `peek-flip` | 0.9 | Three cards flipped in a close fan, paper only. |
| `peek-done` | 0.7 | Three playing cards sliding back onto a draw pile, paper on paper. |
| `execute-strike` | 0.9 | A heavy cloth mourning ribbon dropped onto an empty wooden chair, one low wood hit. No weapon, no scream. |
| `you-died` | 0.8 | The same mourning-ribbon chair hit, closer and duller, as if next to the listener. |
| `win-liberal` | 2.2 | Short hopeful brass chord over wood, 1930s radio sting, two seconds, no melody song. |
| `win-fascist` | 2.2 | Short dark low-string cabinet close, 1930s radio sting, two seconds, no melody song. |
| `role-cascade` | 1.1 | A small deck of cards shuffled once and spread, then one flip. |

`policy-flip` and `party-flip` reuse `card-flip` — no extra file.

## Client hook map

Where to fire once the files exist. Snapshot diffs already drive Ravi
in `RaviNarrator` and `GameScreen`.

| Id | Hook |
|---|---|
| `swap-page` | `AppContext` (done) |
| `player-join` / `player-leave` | `WaitingRoomScreen` — `players.length` / occupancy diff |
| `player-ready` | waiting-room ready toggle on *someone else* (not every self-tap if it feels loud) |
| `room-start` | waiting-room: phase leaves `Lobby` |
| `room-closed` | `RoomClosedNotice` mount (`KICKED` / `HOST_LEFT`) |
| `deal-slide` | `NightOverlay` deal beat, once per seat as the card lands |
| `night-fall` / `card-flip` / `glance-tick` / `night-lift` | `NightOverlay` beat changes |
| `president-seal` | `RaviNarrator` when `board.president` changes; Night finish for first |
| `chancellor-seal` | `ChancellorReveal` mount |
| `nominate-timeout` | log / Ravi `nominate.timeout` |
| `discuss-*` | `RaviNarrator` discussion start / 30 s / end |
| `ballot-tap` | `VotingOverlay` on choose |
| `ballot-slide` | when `hasVoted` flips true on a seat |
| `vote-tally` / `government-*` | vote resolution (same effect that speaks `vote.count` / passed / failed) |
| `tracker-tick` | `GameScreen` tracker increase (already shakes the board) |
| `chaos-hit` | log `chaos` |
| `policy-draw` / `policy-burn` / `policy-pass` | logs `presidentDraws` / burn / `presidentPasses` |
| `law-liberal` / `law-fascist` | `GameScreen` policy-total diff (already speaks Ravi) |
| `veto-*` | logs `vetoProposed` / `vetoAgreed` / `vetoRejected`; unlock on 5th Fascist |
| `seal-open` | enter `SpecialPower` |
| `party-slide` / `party-flip` | `InvestigateOverlay` |
| `peek-flip` | `PowerPanel` peek cards |
| `peek-done` | peek overlay closes / `power.peekDone` |
| `execute-strike` | `seat-death` on the target |
| `you-died` | `YouDiedOverlay` mount |
| `win-*` / `role-cascade` | `GameOverOverlay` |

## Build order

1. Bake the **pilot** 14. Listen with Ravi on and off.
2. Register them in `EFFECTS` and wire the matching hooks (start with
   president / chancellor / vote result / tracker / enact / execute /
   game over — those are the “something happened” beats).
3. Deal + night + legislative flights.
4. Lobby chrome last.

Do not add Music tracks in this pass. The table has to click before
it hums. When you do, the looping catalog is
[`background-music.md`](./background-music.md).
