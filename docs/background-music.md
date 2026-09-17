# Background music — the room under the table

Ravi **says** what happened. SFX is the **object** that happened. Music
is the **room** it happened in: a looping bed that sits under both.

Playback lives in
[`client/docs/audio.md`](../client/docs/audio.md) (`SoundService.playMusic`).
Table one-shots stay in [`sound-effects.md`](./sound-effects.md). Spoken
lines stay in [`ravi-script.md`](./ravi-script.md). This doc is which
loops to bake, when they play, and how to make them in Suno.

**Ceiling: 20 files. Table rooms are 12. Lesson rooms are 2 more**
(`onboard-theme`, `look-theme`). One loop per room, not one
per animation. Most ceremony beats **Keep** the current bed; only a
room change starts a new file. Lesson sting prompts (Suno, not table
foley) live in this file so you bake one sitting.

## Three layers (locked)

| Toggle | What it is | Owner |
|---|---|---|
| **Ravi Voice** | Scripted Persian lines. Subtitles always run. | `RaviService.speak` |
| **Sound Effects** | Table physics + UI punctuation. No words. | `SoundService.play` |
| **Music** | One looping bed at a time. | `SoundService.playMusic` |

Do **not** put speech in a music file. Do **not** replace a gavel, a
card slide, or `win-liberal` / `win-fascist` with a song — those hits
already exist. Music starts after the sting, or hums under it.

Same night bed on every phone. A Liberal device and a Fascist device
must not play different loops during Night.

Prompts never mention the game name, a real historical figure, a
political party, guns, screams, or anthems.

## The 12 rooms

Same era (1930s analog, instrumental, looping). **Different body.**
Suno weights the first words of Style the most — each prompt below
leads with its own instrument and tempo, not a shared bible.

If two takes could be swapped and you would not notice, reject one
and regenerate. The table is the listen test.

| # | Id | Title | Lead (must hear) | Tempo / density | Forbidden on this file | Vol | P |
|---|---|---|---|---|---|---|---|
| 1 | `menu-theme` | Foyer radio | Slow felt-piano foxtrot, distant muted sax | ~70 BPM, sparse | drums, walking bass, clarinet lead | 0.30 | 0 |
| 2 | `play-theme` | Ticket window | Clarinet phrases + light brushes | ~92 BPM, gentle swing | saxophone, trumpet, silence-pads | 0.32 | 1 |
| 3 | `lobby-theme` | Club before the show | Muted trumpet + upright bass + brushes | ~100 BPM, fullest combo | solo piano, drone, no-drums | 0.34 | 0 |
| 4 | `night-ambient` | Velvet veil | Radio hush + one low piano every 8 bars | no pulse, drone | sax, swing, brushes, bass line | 0.24 | 0 |
| 5 | `discuss-theme` | Salon argument | Plucked upright bass, lots of air | ~80 BPM, holes for speech | sax solos, trumpet, drums | 0.28 | 0 |
| 6 | `discuss-late` | Salon after midnight | Bass clarinet in a minor key | ~58 BPM, darker | major foxtrot, trumpet, brushes | 0.26 | 2 |
| 7 | `vote-theme` | Held breath | Single piano notes + muted trombone pad | almost no tempo | swing, brushes, sax, clock ticks | 0.26 | 0 |
| 8 | `legislative-theme` | Quiet desk | Vinyl + one felt fifth, room tone | slowest, almost silent | any horn, bass, drums | 0.22 | 0 |
| 9 | `power-theme` | Cabinet seal | Bowed bass + low clarinet | grave 4-note figure | swing, trumpet, bright piano | 0.26 | 1 |
| 10 | `chaos-theme` | Third failure | Inside-piano string rumble | repeating thud, no groove | jazz combo, melody, explosion | 0.28 | 1 |
| 11 | `over-dawn` | Dawn coda | Felt piano that resolves + distant muted trumpet, major | ~64 BPM, sparse | organ, clarinet, sax, hymn, fanfare | 0.32 | 1 |
| 12 | `over-dusk` | Dusk coda | Reed organ / harmonium + cello | same length as dawn, darker | flugelhorn, major brass, march | 0.32 | 1 |

Bake **P0** first (six files). Skip `discuss-late` until late games feel
flat. Reuse `menu-theme` on Play if you have not baked `play-theme` yet.
Reuse `legislative-theme` for powers until `power-theme` exists.

**Lesson rooms** are not a 13th table file. They never share a table loop
so the first live hand still sounds like sitting down.

| # | Id | Title | Lead (must hear) | Tempo / density | Forbidden on this file | Vol | P |
|---|---|---|---|---|---|---|---|
| 13 | `onboard-theme` | Lesson pages | Soft felt grand, warm major sevenths | almost no pulse | ringtone, music box, melody hook, drums | 0.14 | 0 |
| 14 | `look-theme` | Lesson table | Same piano, almost a pad | drone | melody, pulse, foyer sax | 0.11 | 0 |

Files live in `client/src/assets/sounds/music/{id}.mp3`. Stereo mp3,
128 kbps. Table loops: **−26 LUFS**, true peak **−1.5 dB**. Lesson loops
(`onboard-theme`, `look-theme`): **−30 LUFS**, true peak **−2 dB**.

## Suno (V4.5 / V5 / V5.5)

| Field | Cap | This catalog | What to paste |
|---|---|---|---|
| **Style** | **1000** | max **247** | the Style fence only |
| **Lyrics** | **5000** | max **290** | the Lyrics fence only |
| **Title** | **80** | the `id` | never a long heading |
| **Exclude Styles** | **200** | **156** | the fence below |

V4 is Style 200 / Lyrics 3000 — too small. Use V4.5 or newer.

**Do not paste a shared style bible.** Each Style already starts with
what makes this room different. Suno listens hardest to the first
~200 characters — if they all begin “1930s Weimar jazz club…”, you
get twelve copies of one song.

1. Custom. Instrumental on.
2. Title = `id`.
3. Paste Style, then Lyrics.
4. Exclude Styles:

```
vocals, choir, humming, lyrics, rap, EDM, trap, trailer drums, orchestra climax, electric guitar, chiptune, explosion, siren, scream, gunshot, anthem, march
```

5. Style Influence ~70%. Weirdness ~35% (a little higher than a
   clone-set, so rooms diverge). Generate ~2:00.
6. Crop a repeating loop. Export mp3.

`playMusic` crossfades the outgoing loop ~600 ms.

---

## Prompts — 12 files

### 1. `menu-theme` — Foyer radio

**Style** (247 / 1000)

```
slow foxtrot felt piano, 70 BPM, hotel foyer radio, distant muted saxophone holding long notes only, no drums, no walking bass, no clarinet, analog vinyl crackle, bakelite hiss, instrumental looping underscore, 1930s, sparse, no chorus, no trailer
```

**Lyrics** (290 / 5000)

```
[Instrumental]
[Loop bed]
Hotel foyer, not a jazz stage. A felt piano plays a slow four-bar foxtrot figure, very quiet. Far in the next room a muted saxophone holds long notes, never a solo. Vinyl and bakelite hiss. No drums. No bass. No clarinet. Same texture the whole way. Ready to loop.
```

### 2. `play-theme` — Ticket window

**Style** (219 / 1000)

```
gentle swing 92 BPM, lead clarinet, light brushed snare, soft upright bass, ticket-window energy, brighter than a foyer, instrumental looping bed, 1930s analog, no saxophone, no trumpet, no vocals, no chorus, no trailer
```

**Lyrics** (279 / 5000)

```
[Instrumental]
[Loop bed]
A club ticket window just before the set. Clarinet plays short gentle phrases, not a saxophone. Light brushes on a snare, never a fill. Soft upright bass. Brighter and more forward than a foyer radio. No vocals. No chorus. Constant swing, ready to loop.
```

### 3. `lobby-theme` — Club before the show

**Style** (233 / 1000)

```
salon jazz combo 100 BPM, muted trumpet, walking upright bass, brushed drums, guests sitting down, fullest band in the set, instrumental looping bed, 1930s analog, no solo piano, no ambient drone, no vocals, no applause, no countdown
```

**Lyrics** (239 / 5000)

```
[Instrumental]
[Loop bed]
A small salon while guests take chairs. This is the only track with a real combo: muted trumpet, walking bass, brushes. Felt piano supports, it does not lead. Even energy, never a fill, never applause. Loop-ready.
```

### 4. `night-ambient` — Velvet veil

**Style** (244 / 1000)

```
dark ambient drone, no tempo, bakelite radio static, velvet hush, one very low felt-piano note every eight bars, clarinet as a pad not a melody, no saxophone, no drums, no bass line, no swing, instrumental seamless loop, 1930s analog, no vocals
```

**Lyrics** (240 / 5000)

```
[Instrumental]
[Loop bed]
A closed cabinet at night. Not jazz. Radio hush and velvet. One low piano note, then a long wait. Clarinet is a pad, never a tune. No drums. No saxophone. No pulse. Identical for every listener. Seamless, no swell.
```

### 5. `discuss-theme` — Salon argument

**Style** (244 / 1000)

```
conversation underscore, plucked upright bass ostinato, 80 BPM, lots of silence between notes, no horn solos, no saxophone, no trumpet, no drums, speech must sit on top, instrumental looping bed, 1930s wooden salon, analog, no vocals, no chorus
```

**Lyrics** (219 / 5000)

```
[Instrumental]
[Loop bed]
People arguing at a wooden table. The lead is a plucked upright bass, slow, with holes so voices can sit on top. Almost no piano. No saxophone. No trumpet. No drums. Never a climax. Loop-ready.
```

### 6. `discuss-late` — Salon after midnight

**Style** (202 / 1000)

```
bass clarinet, minor key, 58 BPM, after midnight, no trumpet, no brushes, no major foxtrot, low and lonely, still a talk-over bed, instrumental loop, 1930s analog, no horror stinger, no chase, no vocals
```

**Lyrics** (237 / 5000)

```
[Instrumental]
[Loop bed]
The same salon after midnight, but the lead is now a bass clarinet in a minor key, slower. No walking bass like the early talk. No trumpet. No brushes. Still quiet enough to talk over. Even, dark, ready to loop.
```

### 7. `vote-theme` — Held breath

**Style** (228 / 1000)

```
suspense sparse piano, one note at a time, muted trombone pad, no swing, no drums, no saxophone, no clarinet, no brushes, no clock ticks, no metronome, held breath, instrumental looping bed, 1930s cabinet room, analog, no vocals
```

**Lyrics** (210 / 5000)

```
[Instrumental]
[Loop bed]
A vote not yet counted. Not jazz. Prepared-feeling piano, one note, then wait. A muted trombone pad underneath, no melody. No drums. No clock. No saxophone. Held breath the whole loop.
```

### 8. `legislative-theme` — Quiet desk

**Style** (215 / 1000)

```
almost silent, vinyl crackle, wooden room tone, one felt-piano fifth repeating slowly, no horns, no bass, no drums, no saxophone, quietest track in the set, instrumental loop, 1930s desk, analog, no vocals, no riser
```

**Lyrics** (200 / 5000)

```
[Instrumental]
[Loop bed]
A night desk. Almost nothing. Vinyl and wood air. One felt-piano interval, a fifth, repeating slowly. No horns. No bass. No drums. The quietest loop. Ready under card sounds.
```

### 9. `power-theme` — Cabinet seal

**Style** (206 / 1000)

```
noir bowed double bass, low clarinet chalumeau, four-note grave figure, no swing, no trumpet, no bright piano, no drums, cabinet room, instrumental looping underscore, 1930s analog, no horror cue, no vocals
```

**Lyrics** (211 / 5000)

```
[Instrumental]
[Loop bed]
A sealed envelope on walnut. Bowed double bass and a low clarinet play a short grave figure, then it repeats. Not swing. Not the salon combo. Not the night drone. Formal, dark, looping.
```

### 10. `chaos-theme` — Third failure

**Style** (199 / 1000)

```
inside piano string rumble, prepared piano, repeating low thud, no jazz combo, no melody, no drums, no saxophone, no explosion, instrumental looping bed, wooden cabinet, analog 1930s radio, no vocals
```

**Lyrics** (200 / 5000)

```
[Instrumental]
[Loop bed]
Inside a piano, strings rumble and decay, then the figure returns. Not a jazz club. Not a sting that ends. No explosion. No melody. Dark analog radio. Loop under a card flip.
```

### 11. `over-dawn` — Dawn coda

**Style** (243 / 1000)

```
slow major salon 64 BPM, felt piano that resolves, distant muted trumpet long notes only, no drums, no bass, no clarinet, no saxophone, no organ, vinyl crackle, instrumental looping coda, 1930s, no hymn, no fanfare, no choir, no victory jingle
```

**Lyrics** (273 / 5000)

```
[Instrumental]
[Loop bed]
The salon radio after the news. Felt piano plays a slow four-bar figure in major and it resolves. Far away a muted trumpet holds warm long notes, never a fanfare. Vinyl hiss. No drums. No bass. No clarinet. Not a hymn. Same texture. Ready to loop.
```

### 12. `over-dusk` — Dusk coda

**Style** (188 / 1000)

```
reed organ harmonium, cello, minor, dusk, same slow length as a dawn hymn but darker, no flugelhorn, no muted brass, no march, no anthem, instrumental looping coda, 1930s analog, no vocals
```

**Lyrics** (197 / 5000)

```
[Instrumental]
[Loop bed]
Dusk in a closed cabinet. Reed organ and cello, minor. Same slow shape as the dawn coda, opposite colour. No flugelhorn. No march. No anthem. Looping aftertaste. Seamless.
```

---

## Prompts — lesson (2 loops + 10 stings)

Bake in the web app. Free Suno has **no API**. Custom. Instrumental on.
Title = the `id`. Style Influence ~70%. Weirdness ~28% on loops, **~40%**
on stings so they do not all come out the same plink.

Lesson Exclude Styles (165 / 200) — paste these instead of the table fence:

```
vocals, choir, lyrics, rap, EDM, drums, orchestra, guitar, chiptune, explosion, siren, anthem, saxophone, trumpet, gavel, foley, cartoon, music box, ringtone, chorus
```

**Loops:** generate ~2:00. Crop ~36s. If you can hum a figure, reject.
Target **−30 LUFS**, true peak **−2 dB**. Files:
`client/src/assets/sounds/music/{id}.mp3`.

**Stings:** shortest take (~0:15). Crop **one motif + decay**. Playback is
`SoundService.play`, files in `client/src/assets/sounds/effects/{id}.mp3`,
**−21 LUFS**, true peak **−1.5 dB**. Wiring:
[`onboarding-audio.md`](./onboarding-audio.md).

```bash
ffmpeg -y -i raw.mp3 \
  -af "loudnorm=I=-30:TP=-2:LRA=5" \
  -ac 2 -b:a 128k \
  client/src/assets/sounds/music/{id}.mp3
```

```bash
ffmpeg -y -i raw.mp3 \
  -af "adelay=40:all=1,apad=pad_dur=0.12,loudnorm=I=-21:TP=-1.5:LRA=8" \
  -ac 1 -b:a 96k \
  client/src/assets/sounds/effects/{id}.mp3
```

### 13. `onboard-theme` — Lesson pages

**Style** (203 / 1000)

```
soft felt grand piano, Gymnopedie, slow warm major sevenths, Cmaj7 G Am F, enjoyable, easy to sit with, wooden cabinet, analog hiss, instrumental seamless loop, 1930s, no ringtone, no music box, no drums
```

**Lyrics** (289 / 5000)

```
[Instrumental]
[Loop bed]
A quiet felt piano in a small wooden room. Slow overlapping chords, warm and pleasant, never a tune you wait for. Someone is teaching a game at a cabinet table. Soft hammer, wool on the strings. Easy to stay with for minutes. Same texture the whole way. Seamless.
```

### 14. `look-theme` — Lesson table

**Style** (238 / 1000)

```
soft felt grand piano pad, Gymnopedie, two notes held, warm C major fifth, quieter than a lesson page, enjoyable, speech sits on top, wooden cabinet, almost no pulse, instrumental seamless loop, 1930s, no melody, no ringtone, no music box
```

**Lyrics** (177 / 5000)

```
[Instrumental]
[Loop bed]
The same felt piano, even quieter, almost a pad. Long warm fifths. Someone is pointing at a table. No figure. No fill. Comfortable. Seamless, no swell.
```

### `onboard-turn`

**Style** (141 / 1000)

```
one soft felt-piano tap, middle register, wooden room, 0.9 seconds, comforting UI chime, then complete silence, instrumental sting, no melody
```

**Lyrics**

```
[Instrumental]
[Short sting]
One soft piano tap, like turning a page at a cabinet table. The note dies. Then silence. Not a song.
```

### `onboard-roles`

**Style** (166 / 1000)

```
three felt-piano notes fanned like secret identity cards on walnut, rolled C E G, 1.6 seconds, mysterious but warm, then silence, instrumental sting, no second phrase
```

**Lyrics**

```
[Instrumental]
[Short sting]
Three piano notes spread like three facedown cards. Last note rings. Then silence. Not a fanfare.
```

### `onboard-seats`

**Style** (125 / 1000)

```
warm felt-piano open fifth, chairs around a cabinet table, 1.3 seconds, inviting, then silence, instrumental sting, no melody
```

**Lyrics**

```
[Instrumental]
[Short sting]
One open fifth, five seats around a table. Warm wood. The chord dies. Then silence.
```

### `onboard-boards`

**Style** (145 / 1000)

```
two felt-piano fifths, first cream and hopeful, second darker wood, two coloured tracks on a table, 1.6 seconds, instrumental sting, then silence
```

**Lyrics**

```
[Instrumental]
[Short sting]
A bright fifth, then a darker fifth. Two boards on a table. Then silence. Not a jingle.
```

### `onboard-offices`

**Style** (138 / 1000)

```
two-note felt-piano grant, lower seat then a higher seat, wooden placards, 1.4 seconds, not a brass bell, instrumental sting, then silence
```

**Lyrics**

```
[Instrumental]
[Short sting]
Low piano seat, then a higher piano seat. Two offices handed over. Then silence.
```

### `onboard-vote`

**Style** (134 / 1000)

```
two felt-piano notes, a questioning rise then a falling no, yes-or-no ballots, 1.2 seconds, instrumental sting, then silence, no choir
```

**Lyrics**

```
[Instrumental]
[Short sting]
One note asks, the next note falls. A ballot. Then silence. Not a drum hit.
```

### `onboard-tracker`

**Style** (117 / 1000)

```
three walking felt-piano notes, small wooden marker, one pip at a time, 1.1 seconds, instrumental sting, then silence
```

**Lyrics**

```
[Instrumental]
[Short sting]
Three short piano steps, a marker moving. Then silence. Not a clock.
```

### `onboard-chaos`

**Style** (132 / 1000)

```
low dissonant felt-piano rumble, inside the piano, third failure, grave, 1.5 seconds, no explosion, instrumental sting, then silence
```

**Lyrics**

```
[Instrumental]
[Short sting]
Low clustered piano, the table fails a third time. Grave, not loud. Then silence. No boom.
```

### `onboard-deck`

**Style** (141 / 1000)

```
four-note felt-piano deal upward, a small deck of law cards, last note rings, 1.4 seconds, instrumental sting, then silence, not a harp gliss
```

**Lyrics**

```
[Instrumental]
[Short sting]
Four soft notes dealt upward. Last note rings in a wooden room. Then silence. Not a shuffle foley.
```

### `onboard-laws`

**Style** (112 / 1000)

```
three felt-piano tiles placed on a board, rising, 1.4 seconds, not a wax stamp, instrumental sting, then silence
```

**Lyrics**

```
[Instrumental]
[Short sting]
Three piano tiles set on a board, rising. Then silence. Not a stamp, not a gavel.
```

---

## When to play which (map, not extra files)

**Play** starts the file. **Keep** = do not call `playMusic`. **Crossfade**
replaces the loop (~600 ms).

| Scene / step | Track | Action |
|---|---|---|
| Home, rules, how-to-play (all 6 tutorial steps), settings, about | `menu-theme` | Play / Keep |
| Play, create-room, join-game | `play-theme` | Play / Keep |
| Waiting room (join, ready, empty) | `lobby-theme` | Play / Keep |
| Host starts → Night deal / private look / glance | `night-ambient` | Crossfade |
| Night lifts, first President | `discuss-theme` | Crossfade |
| Discussion 5 min + nomination + chancellor reveal (early / mid) | `discuss-theme` | Play / Keep |
| Discussion + nomination when liberal ≥ 4 or dark ≥ 4 or tracker on 2 | `discuss-late` | Play |
| Voting (cards, tap, flight, tally) | `vote-theme` | Crossfade / Keep |
| Government elected → legislative draw / discard / pass / enact / veto offer / veto refuse / liberal law / veto unlock | `legislative-theme` | Crossfade / Keep |
| Government rejected (tracker 1–2), veto accepted, dark law with no power, chaos law done | `discuss-theme` | Crossfade |
| Third failed government | `chaos-theme` | Play |
| Dark law on a powered slot; investigate / peek / special election / execute / you-died | `power-theme` | Crossfade / Keep |
| Liberal win (5 laws or secret leader executed) | `over-dawn` | Crossfade after `win-liberal` |
| Dark-party win (6 laws or secret leader elected Chancellor) | `over-dusk` | Crossfade after `win-fascist` |
| Role cascade | `over-dawn` or `over-dusk` | Keep |
| Chat, game menu, players, leave overlay | *(current)* | Keep |
| Room closed | `menu-theme` | Stop, then Play |
| Onboarding intro (step 0) | `onboard-theme` | Play — not the foyer |
| Look table (step 1) | `look-theme` | Play — one bed for the whole walk |
| Scripted match (steps 2–7) | same as live | from `playView` |

Late board uses `discuss-late` **only** on discussion / nomination. Vote
and desk stay the same. Onboarding intro/look never share a table file.
Sting wiring (which piece plays which `onboard-*`) is
[`onboarding-audio.md`](./onboarding-audio.md).

Do not add a 13th **table** file for 30 s warn, Ja vs Nein, or a victim-only
death bed. Those are SFX, or they leak. Lesson beds are `onboard-theme` /
`look-theme`, not a 13th table room.

## Wiring

```ts
import menuThemeUrl from '../assets/sounds/music/menu-theme.mp3';

const MUSIC = {
  'menu-theme': { src: menuThemeUrl, volume: 0.3 },
  'play-theme': { src: playThemeUrl, volume: 0.32 },
};
```

| Hook | Call |
|---|---|
| `home` / `rules` / `how-to-play` / `settings` / `about` | `playMusic('menu-theme')` |
| onboarding intro | `playMusic('onboard-theme')` |
| look table | `playMusic('look-theme')` |
| `play` / `create-room` / `join-game` | `playMusic('play-theme')` |
| `waiting-room` | `playMusic('lobby-theme')` |
| Night overlay / `room-start` | `playMusic('night-ambient')` |
| Nomination + discussion (not late) | `playMusic('discuss-theme')` |
| Nomination + late board | `playMusic('discuss-late')` |
| `Phase.Voting` | `playMusic('vote-theme')` |
| Legislative phases | `playMusic('legislative-theme')` |
| `Phase.SpecialPower` | `playMusic('power-theme')` |
| Chaos | `playMusic('chaos-theme')` |
| Liberal win | `playMusic('over-dawn')` |
| Dark-party win | `playMusic('over-dusk')` |
| Chat / game menu | Do not call `playMusic` |

## Bake order

1. **P0 (6):** `menu-theme`, `lobby-theme`, `night-ambient`, `discuss-theme`, `vote-theme`, `legislative-theme`
2. **Lesson (2 + 10):** `onboard-theme`, `look-theme`, then the ten `onboard-*` stings
3. **P1 (5):** `play-theme`, `power-theme`, `chaos-theme`, `over-dawn`, `over-dusk`
4. **P2 (1):** `discuss-late`

Listen on a phone with Ravi Voice on, then off. If a bed fights
speech, lower volume before rewriting the prompt. **If two files
could swap and you would not notice, regenerate** — they are clones.
