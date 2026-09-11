# Ravi — the table narrator

Ravi is the table’s presenter: an on-screen 1930s radio host who tells
every player **what just happened** and **what to do next**. It is not a
live AI, and it is not a player at a seat. It is a scripted ceremony
layer on top of the engine, with a visible character, a subtitle, and
optional spoken audio.

This doc is the system. The words themselves live in
[`ravi-script.md`](./ravi-script.md). The pictures, timings, and “who sees
what” live in [`gamification.md`](./gamification.md).

## Why it exists

Players currently learn the game from a thin header line, a toast, and a
chat log. That is why people miss their role, miss whose turn it is, and
stare at the board with no idea a vote or a law is happening.

Ravi fixes the *public* story. Private information (your role, the three
laws in the President’s hand) is shown only on that player’s screen.
The investigation party is spoken only on the President’s device, after
the card face — never as a shared table line.

## On-screen character

Locked: Ravi is a **visible person**, not only a voice in the header.

The table already looks like Weimar paper, postage, and newsprint. Ravi
matches that as a radio-show host in a cameo frame:

- Oval / circular portrait, like a 1932 wireless broadcast. Not a seat
  at the table (that would look like an 11th player).
- Lives in a **Ravi dock** on the game page — header-adjacent on
  desktop, a small pinned cameo on mobile so it never covers a seat.
- Two portraits, because both voices are in: **Farid** (male, grave)
  and **Dilara** (female, clear). Settings pick the voice; the matching
  portrait shows.
- Two art poses per portrait: **idle** (listening) and **speaking**
  (frame gilt lights, mouth slightly open). Swap poses with opacity —
  no lip-sync.
- The spoken line is a plaque / speech card next to the cameo, *and*
  duplicated in the parchment header so it stays readable if the cameo
  is small. `aria-live` stays on the header.
- Idle most of the time. The cameo only “leans in” for a beat, then
  settles, so it does not compete with cards in flight.

Do not put Ravi on a chair, do not give them a vote, do not let them
hold policy cards. They announce. They do not play.

## Do not generate lines at runtime

ChatGPT / Gemini / any LLM must **not** invent lines during a live game.

| Live AI speech | Scripted catalog |
|---|---|
| 1–8 s of lag before every beat | Instant: subtitle + pre-recorded clip |
| Different wording every time, easy to leak a secret | Same line, every table, never a secret |
| Cost per game, needs a key, fails offline | Files in the bundle |
| Names and numbers come out wrong in Persian TTS | Templates with `{name}` in text only |

The “AI” step is **authoring**: we write the catalog, then (optionally) run
a TTS studio once to record the clips. After that, the game is a player.

```
ravi-script.md          ← human-editable source of truth for the words
        ↓
i18n keys `ravi.*`      ← fa.ts / en.ts, same ids, `{name}` / `{ja}` params
        ↓
RaviService.speak(id)   ← subtitle in the header + SoundService clip
        ↓
mp3 per line            ← pre-recorded, named by id (deal.start.mp3, …)
```

A line id is a string like `deal.start` or `vote.passed`. The client never
concatenates sentences. If a beat needs a name, the **subtitle** interpolates
it and the **audio** uses a nameless take (“رئیس‌جمهور این دور معلوم شد”)
while the header already shows the name. Spoken player names are the thing
TTS gets wrong; we do not depend on them.

## What Ravi is allowed to say

Public table facts only:

- A phase began or ended (“خب، وقت حرف زدنه”).
- Who holds a **public** office (President, chosen Chancellor).
- Vote totals after the cards are revealed.
- Which colour of **enacted** law hit the board (that is public).
- That a power is in play (“رئیس‌جمهور باید کارت یکی رو چک کنه”).
  The check’s party is a President-only line after the card face.
- Win / loss.

Never:

- Anyone’s secret role or party, including “ fascists, open your eyes ”
  as a *different* audio clip from what liberals hear (phones on one sofa
  would leak). Night uses **one shared line**; only the picture differs.
- The three laws the President drew, or which one was burned.
- An investigation result as a *shared* line. The President’s client
  may say `power.investigatedLiberal` / `power.investigatedFascist`
  after the card; other seats only hear that a card was checked.
- How any living player voted. Ballots stay anonymous for the whole
  game. Ravi may speak **totals only** (“۴ موافق، ۱ مخالف”).

## How it plays with the engine

The server stays the source of truth. Ravi and the card motion are a
**client ceremony** driven by the snapshot the server already sent.

```
server: deal roles + Phase.Night + clock
        ↓  full GameStateView (you.role, visible teammates, deadline)
client: animation.enqueue the deal / look / glance
        ravi.speak the public lines
```

Night is a real engine phase (`Phase.Night`), server-timed, so a rejoin
lands in the same beat. The client never invents a role, never guesses
who the Fascists are, and never starts Night because a local timer fired.
It only *stages* what `you.role` and `players[].role` already contain
(`Room.roleVisibleTo` already sends teammates to the right viewers).

When the server clock ends, the engine moves to `Nomination` (discussion).
The client plays `night.end` → `president.first` off that transition.

Same pattern as discussion / vote already: a `nightDeadline`
`{ startedAt, endsAt }` on the snapshot. The client uses that clock to
pace the deal (backs flying one by one to seats, with `deal.start`) →
night + private look (`night.start`) → glance → day (`night.end`), then
waits for the phase change.
A player who taps «فهمیدم» only skips *their* look overlay; it does not
end Night for the table.

| Phase | Ravi |
|---|---|
| `Night` (new) | Deal, private look, team glance, first President |
| `Nomination` | Discussion, then “صدراعظم رو انتخاب کنه” |
| `Voting` | “رأی‌گیری آغاز شد” |
| `PresidentLegislative` | “سه تا قانون می‌ره دست رئیس‌جمهور” |
| `ChancellorLegislative` | “دو تا قانون می‌ره دست صدراعظم” |
| `SpecialPower` | The matching power line |
| `GameOver` | Winner line + role cascade (no voice over secrets until cards are up) |

Until `Night` exists, `startGame` deals roles and jumps straight into
`Nomination` with a 3-minute chat and a tiny “you are X” label. That is
the hole Ravi + Night is meant to fill. Discussion becomes **5 minutes**
once we touch that timer; the President may still skip.

`LogCode` already covers most beats (`nominated`, `votePassed`,
`liberalEnacted`, …). Add codes only when a beat has no log today
(deal, night, discussion opening, chaos tracker tick).

## Audio production

Do **not** invent lines at runtime. Bake mp3s once from
[`ravi-script.md`](./ravi-script.md), then commit them.

Azure Farid/Dilara sound like a GPS. The baked set uses **pocket-tts-farsi**
(native Persian, short radio lines). Farid is a **male** speaker prompt;
Dilara is the model’s **female** narrator. Same filenames, two folders.

```
scripts/generate-ravi-voices.py --engine pocket --who farid,dilara
```

Rebuild one id after a wording change:

```
scripts/generate-ravi-voices.py --engine pocket --who farid --ids vote.start
```

TTS cannot read some Persian spellings. The **audio** catalog uses
`رای` (not `رأی` — otherwise it says «ری»), drops ZWNJ, and says
`حق وتو` so «وتو» is not read as «و تو». All clips for a voice come
from the same pocket-tts speaker — do not mix Azure in for a few lines.
Spoken names stay out of the mp3; the header already shows `{name}`.

Export: **mono mp3, 64–96 kbps, loudness-normalized**, 0.15 s pad at
head/tail. Files live in `client/src/assets/sounds/ravi/farid/` and
`…/dilara/`. Register them next to `EFFECTS` (or a sibling `RAVI` map)
in `SoundService` when playback is wired.

ChatGPT / Gemini must not write new lines during a live game. Optional
bake engines (`gemini`, `eleven`) exist on the script if we ever swap
studio; the words still come from the catalog.

Human record is still the gold standard if we can get one actor for
~80 short lines.

The SFX catalog (card slides, stamps, gavel, tracker pawn) is
[`sound-effects.md`](./sound-effects.md).

Playback rules:

- **Two independent toggles** (keep both for now; we can drop one later):
  - **Sound Effects** — card flights, tracker tick, vote pile, etc.
  - **Ravi voice** — spoken lines only. Subtitle and cameo still run
    when voice is off.
- Music stays its own toggle, as today.
- Voice *who*: Farid or Dilara, a third setting, independent of on/off.
- `RaviService` ducking: start the clip, cancel the previous one if a new
  beat starts (never layer two sentences).
- Subtitle always shows, even when Ravi voice is off. The header is the
  accessible version (`aria-live="polite"` is already on `GameEventHeader`).
- Reduce Motion does not skip subtitles; it only skips the card motion.

A 10-line **pilot**, recorded in **both** voices: `deal.start`,
`president.first`, `discuss.start`, `nominate.start`, `vote.start`,
`vote.passed`, `vote.failed`, `law.liberal`, `law.fascist`,
`game.liberalsWin.policies`. Listen on a phone speaker, then batch the
rest. Clips live in `…/ravi/farid/` and `…/ravi/dilara/` with the same
filenames.

## Client shape (when we build it)

One owner, same pattern as `SoundService` / `AnimationService`:

```ts
ravi.speak('vote.passed', { ja: 4, nein: 1, total: 5 })
```

- Resolves the i18n string into the header **and** the cameo plaque.
- Swaps the portrait to the speaking pose for the duration of the clip.
- Plays the matching clip for the selected voice (Farid / Dilara) if
  voice is on and a file exists.
- Returns a promise on `audio.ended` (or a 1.2 s hold if there is no
  clip) so the animation queue can wait.

Nameless audio + named subtitle means missing clips are fine — the table
still reads the line.

## Locked decisions

- Discussion window: **5 minutes**. President may still skip.
- Votes: **anonymous**. Totals only; never who voted Ja or Nein.
- Ravi: **on-screen character** (cameo + plaque), plus header subtitle.
- Voice talent: **Farid and Dilara** both ship; settings pick one.
- Toggles: **Sound Effects** and **Ravi voice** are both present for
  now (plus Music, as today). We can drop one later.
- Office title: **صدراعظم** (never نخست وزیر). Seats, Ravi, and rules
  all use this word. English stays **Chancellor**.
- Night: **server owns the data and the clock**; the client only
  animates it. See above.
