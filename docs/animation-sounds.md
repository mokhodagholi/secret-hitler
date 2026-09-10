# Animation sounds — one hit per motion

Background loops stay in [`background-music.md`](./background-music.md).
This file is the **other** layer: a short table hit that starts on the
**same frame** as an animation in
[`client/src/animations/registry.ts`](../client/src/animations/registry.ts).

The current `effects/*.mp3` set is too long and too musical for these
motions (1–3 s stings, brass bells, saxophone, organ). A 450 ms card
flip should not play a 1.6 s sting. These prompts are **dry foley**,
one object, duration ≈ the animation.

Ravi still speaks. Music still loops. This layer is only the object
moving.

Playback: [`client/docs/audio.md`](../client/docs/audio.md)
(`SoundService.play`). Motion: [`client/docs/animations.md`](../client/docs/animations.md).
The older event catalog (gavel, tracker, veto, wins) stays in
[`sound-effects.md`](./sound-effects.md) — do not mix those stings into
this list.

## Locked

- **ElevenLabs Sound Generation**, not Suno. Suno makes looping beds.
  These clips are 0.5–0.8 s.
- **No voice, no letters, no melody, no saxophone, no organ, no
  choir, no gun, no scream, no UI click, no whoosh riser.**
- Same clip on every phone. Night must not leak a role.
- `fade-in` is silent. It fires on every overlay; scoring it would
  rattle the table.
- `turn-enter` is in the registry but **not wired**. No file until a
  caller exists.
- `card-flip-in` and `card-flip-face` share **one** file (`card-flip`).
- `policy-exit` (discard) and `card-to-board` (enact) are two different
  objects: a drop vs a slide-up. Two files.

Export: mono mp3, 96 kbps, **−20 LUFS**, true peak **−1.5 dB**, ~40 ms
pad. Bake duration in the table (ElevenLabs `duration_seconds`, minimum
0.5).

Prefix (the bake script prepends this; in the UI, include it). Whole
prompt must stay **≤ 450** characters:

```
Close analog 1930s tabletop recording. One clear event. No voice, no letters, no gunshot, no scream, no cartoon, no sci-fi.
```

## How to bake

Same as [`sound-effects.md`](./sound-effects.md):
`scripts/generate-sound-effects.py`, or the
[ElevenLabs Sound Effects](https://elevenlabs.io/app/sound-effects) UI
→ paste **only** the prompt → duration from **Dur** → ffmpeg loudnorm.

Replace the matching id in `EFFECTS` inside the bake script, then:

```bash
python3 scripts/generate-sound-effects.py --force --ids swap-page,overlay-land,card-flip,badge-seal,policy-flip,policy-slot,card-fly,seat-empty,placard-land,deck-tick,table-jolt,deal-slide,party-arrive,policy-travel
```

Listen on a phone. If it sounds like a game power-up, rewrite that
one prompt — do not ship it.

## Registry (named animations)

| Animation | Dur | Wired | SFX id | Play on |
|---|---|---|---|---|
| `fade-in` | 200 ms | overlays, tips | — | **Silent** |
| `screen-enter` | 260 ms | every `<Screen>` | `swap-page` | `animation.play(..., 'screen-enter')` |
| `pop-in` | 260 ms | overlays, toast, menu | `overlay-land` | `animation.play(..., 'pop-in')` |
| `card-flip-in` | 450 ms | night role, peek fan, game-over cascade | `card-flip` | start of the flip |
| `badge-pop` | 320 ms | President / Chancellor ribbon | `badge-seal` | badge lands |
| `policy-reveal` | 650 ms | enacted law, centre stage | `policy-flip` | start of reveal (colour is the picture; this hit is the same) |
| `policy-exit` | 350 ms | discard / investigate close | `policy-slot` | start of exit |
| `seat-death` | 700 ms | execution | `seat-empty` | start of `seat-death` |
| `turn-enter` | 320 ms | **not wired** | — | skip |
| `card-flip-face` | 480 ms | investigate party face | `card-flip` | reuse |
| `placard-present` | 700 ms | in registry, **not wired yet** | `placard-land` | bake now; hook when the placard call is added |
| `card-to-board` | 450 ms | Chancellor enact | `card-fly` | start of `card-to-board` |
| `count-tick` | 280 ms | draw / discard count | `deck-tick` | `DeckStrip` count change |
| `shake` | 380 ms | failed election, rejected action | `table-jolt` | `animation.play(..., 'shake')` |

## Custom flights (not in the registry)

These use `animation.playCustom`. They still need a hit.

| Motion | Dur | Where | SFX id |
|---|---|---|---|
| Deal back flies pile → seat | 560 ms | `NightOverlay` `flyToSeat` | `deal-slide` (once per seat, overlap OK) |
| Party pass flies seat → centre | 700 ms | `InvestigateOverlay` | `party-arrive` |
| Law backs travel (draw / pass) | 780 ms | `LegislativeModal` | `policy-travel` |

---

## Prompts

Copy **one** prompt. Duration is the ElevenLabs length, not a trim
after the fact.

### `swap-page` — `screen-enter` — 0.5 s

```
One thin paper page turned in a bound booklet on a wooden desk. Short paper rustle, then silence. No whoosh. No click.
```

### `overlay-land` — `pop-in` — 0.5 s

```
A small wooden lid or felt-lined box set down once on a desk. Soft thud, short. No bounce, no chime, no click.
```

### `card-flip` — `card-flip-in` + `card-flip-face` — 0.5 s

```
One thick plastic-coated poker card flipped face-up onto polished walnut. Single crisp snap of card stock. Dry, close mic. No paper crumple, no music.
```

### `badge-seal` — `badge-pop` — 0.5 s

```
A small brass wax-stamp tapped once onto a cloth ribbon. Tiny metal tap, dry wood underneath. No bell ding, no fanfare.
```

### `policy-flip` — `policy-reveal` — 0.7 s

```
A thick law card rises and flips face-up onto a wooden board. Card stock slap, then a short settle. One event. No stamp melody, no choir.
```

### `policy-slot` — `policy-exit` — 0.5 s

```
A playing card dropped onto a discard stack. Paper on paper, short. No fire crackle. No slide into a slot.
```

### `card-fly` — `card-to-board` — 0.5 s

```
A thick card sliding a short distance up a wooden board and stopping. Paper-on-wood, one move. No whoosh, no sparkle.
```

### `seat-empty` — `seat-death` — 0.7 s

```
A heavy cloth mourning ribbon dropped onto an empty wooden chair, then one low wood knock. Formal. No weapon, no body, no scream, no bell peal.
```

### `placard-land` — `placard-present` — 0.7 s

```
A wooden desk placard set down on oak, then a small brass stamp tap. Weight, then stop. No service bell, no melody.
```

### `deck-tick` — `count-tick` — 0.5 s

```
One card leaving a draw pile: a tiny paper tick, very short. Close mic. No clock, no beep.
```

### `table-jolt` — `shake` — 0.5 s

```
A wooden table jolted once, cups and cards rattle a little, then stop. Low, dry. No smash, no saxophone, no cartoon spring.
```

### `deal-slide` — deal flight — 0.6 s

```
One thick poker card sliding across a polished wooden table and stopping with a snap. Playing-card stock, not newspaper. Dry. No whoosh.
```

### `party-arrive` — investigate flight — 0.7 s

```
A thicker identity-pass card sliding from a seat onto the table centre. Heavier than a ballot. Paper-on-wood. One move. No flip yet.
```

### `policy-travel` — legislative travel — 0.8 s

```
Two or three poker-card backs sliding together across wood, fast, one take. Card stock, not paper flutter. No melody.
```

---

## Play order on busy beats

SFX starts with the motion. Ravi speaks over or just after. Music stays
underneath.

| Beat | Order |
|---|---|
| Navigate | `swap-page` with `screen-enter` |
| Overlay opens | `overlay-land` with `pop-in` (`fade-in` stays silent) |
| Night deal | `deal-slide` × N as each back leaves, then `card-flip` on `card-flip-in` |
| Badge lands | `badge-seal` with `badge-pop` |
| Failed election | `table-jolt` with `shake` |
| Enact | `policy-flip` with `policy-reveal` → hold → `policy-slot` or `card-fly` on exit |
| Investigate | `party-arrive` on the flight → `card-flip` on `card-flip-face` |
| Peek / role cascade | `card-flip` staggered with each `card-flip-in` — if it is noisy, play **once** at the start of the cascade instead |
| Execution | `seat-empty` with `seat-death` |

Do not also fire `law-liberal` / `law-fascist` on the same frame as
`policy-flip` until you have listened. One object per beat. If the
colour stamp is still wanted, it comes **after** `policy-flip` settles,
not on top of it.

## Wiring

Call `sound.play('id')` in the same ref / `enqueue` step that starts the
animation. Volume **0.45–0.6**. `seat-empty` may go to **0.65**.

Reduce Motion skips the animation and **keeps** the SFX.

```ts
ref={(element) => {
  void animation.play(element, 'pop-in');
  sound.play('overlay-land');
}}
```
