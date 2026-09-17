# Onboarding audio — a different room from the table

The live table is gavel, wax, and card stock
([`sound-effects.md`](./sound-effects.md)). Intro and look are a **lesson
at that same cabinet**. They keep the live catalog off the speaker so the
first real hand still sounds like sitting down.

**Suno prompts live in [`background-music.md`](./background-music.md)**
(lesson rooms 13–14 and the ten `onboard-*` stings). Bake there. This
file is when they play, and which sting maps to which piece.

Playback is still [`SoundService`](../client/docs/audio.md). These files
are extra keys, not aliases.

## When which room

| Step | Track | SFX |
|---|---|---|
| 0. Intro pages | `onboard-theme` | Piece motifs below. Tracker marks use `onboard-tracker` / `onboard-chaos`. |
| 1. Look table | `look-theme` | Same family, quieter. Punch-out plays that piece’s motif. |
| 2–7. Scripted match | Live table beds | Live table SFX. The lesson is over. |

| Kind | Id | Lead | Dur | Vol |
|---|---|---|---|---|
| loop | `onboard-theme` | Soft felt grand, warm major sevenths | almost no pulse | 0.14 |
| loop | `look-theme` | Same piano, almost a pad | drone | 0.11 |
| sting | `onboard-turn` | One soft middle-piano tap | 0.9 | 0.48 |
| sting | `onboard-roles` | Three secret-card notes, a fan | 1.6 | 0.52 |
| sting | `onboard-seats` | Warm open fifth — chairs around a table | 1.3 | 0.5 |
| sting | `onboard-boards` | Bright fifth, then a darker fifth | 1.6 | 0.5 |
| sting | `onboard-offices` | Two-note grant: low seat, then a higher seat | 1.4 | 0.52 |
| sting | `onboard-vote` | Question up, then a no that falls | 1.2 | 0.5 |
| sting | `onboard-tracker` | Three walking notes, one pip each | 1.1 | 0.5 |
| sting | `onboard-chaos` | Low dissonant piano rumble | 1.5 | 0.52 |
| sting | `onboard-deck` | Four-note deal, last note rings | 1.4 | 0.5 |
| sting | `onboard-laws` | Three tiles placed, rising | 1.4 | 0.5 |

Replace takes in place. Do not add a second key.

## Wiring

| Hook | Call |
|---|---|
| intro screen | `playMusic('onboard-theme')` |
| look table | `playMusic('look-theme')` |
| intro slide visual | `effectForIntroVisual` → `onboard-*` |
| intro tracker fill | `onboard-tracker`; third mark `onboard-chaos` |
| look punch-out | `effectForLookTarget` → `onboard-*` |
| live overlays during look | do not play table foley |
| five-player table starts | live `trackForScene` |
