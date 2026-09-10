# Background music — the room under the table

Ravi **says** what happened. SFX is the **object** that happened. Music
is the **room** it happened in: a looping bed that sits under both.

Playback lives in
[`client/docs/audio.md`](../client/docs/audio.md) (`SoundService.playMusic`).
Table one-shots stay in [`sound-effects.md`](./sound-effects.md). Spoken
lines stay in [`ravi-script.md`](./ravi-script.md). This doc is which
loops to bake, when they play, and how to make them in Suno.

**Ceiling: 20 files. This catalog is 12.** One loop per room, not one
per animation. Most ceremony beats **Keep** the current bed; only a
room change starts a new file.

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

| # | Id | Title | Plays during | Vol | Loop | P |
|---|---|---|---|---|---|---|
| 1 | `menu-theme` | Foyer radio | Home, rules, how-to-play, settings, about, room-closed | 0.30 | 70–90 s | 0 |
| 2 | `play-theme` | Ticket window | Play, create-room, join-game | 0.32 | 60–80 s | 1 |
| 3 | `lobby-theme` | Club before the show | Waiting room | 0.34 | 80–100 s | 0 |
| 4 | `night-ambient` | Velvet veil | Night: deal, private look, glance | 0.24 | 50–70 s | 0 |
| 5 | `discuss-theme` | Salon argument | Discussion + nomination (early / mid) | 0.28 | 90–120 s | 0 |
| 6 | `discuss-late` | Salon after midnight | Discussion + nomination when the board is nearly won | 0.26 | 80–110 s | 2 |
| 7 | `vote-theme` | Held breath | Voting overlay through the tally | 0.26 | 45–70 s | 0 |
| 8 | `legislative-theme` | Quiet desk | President / Chancellor legislative + veto | 0.22 | 50–80 s | 0 |
| 9 | `power-theme` | Cabinet seal | Investigate, peek, special election, execute | 0.26 | 55–80 s | 1 |
| 10 | `chaos-theme` | Third failure | Chaos — top law, no power | 0.28 | 40–60 s | 1 |
| 11 | `over-dawn` | Dawn coda | Liberal win, after `win-liberal` | 0.32 | 70–90 s | 1 |
| 12 | `over-dusk` | Dusk coda | Dark-party win, after `win-fascist` | 0.32 | 70–90 s | 1 |

Bake **P0** first (six files). Skip `discuss-late` until late games feel
flat. Reuse `menu-theme` on Play if you have not baked `play-theme` yet.
Reuse `legislative-theme` for powers until `power-theme` exists.

Files live in `client/src/assets/sounds/music/{id}.mp3`. Stereo mp3,
128 kbps. Target **−26 LUFS**, true peak **−1.5 dB**.

## Suno (V4.5 / V5 / V5.5)

| Field | Cap | This catalog | What to paste |
|---|---|---|---|
| **Style** | **1000** | max **478** | the Style fence only |
| **Lyrics** | **5000** | max **332** | the Lyrics fence only |
| **Title** | **80** | the `id` | never a long heading |
| **Exclude Styles** | **200** | **156** | the fence below |

V4 is Style 200 / Lyrics 3000 — too small. Use V4.5 or newer.

1. Custom. Instrumental on.
2. Title = `id`.
3. Paste Style, then Lyrics. Do not prepend a second style bible.
4. Exclude Styles:

```
vocals, choir, humming, lyrics, rap, EDM, trap, trailer drums, orchestra climax, electric guitar, chiptune, explosion, siren, scream, gunshot, anthem, march
```

5. Style Influence ~70%. Weirdness ~25%. Generate ~2:00.
6. Crop a repeating loop. Export mp3.

`playMusic` today hard-cuts. When wiring, fade the outgoing loop ~600 ms.

---

## Prompts — 12 files

### 1. `menu-theme` — Foyer radio

**Style** (450 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, slow foxtrot harmony, very sparse, no walking bass, no drum kit
```

**Lyrics** (324 / 5000)

```
[Instrumental]
[Loop bed]
A quiet 1930s radio playing in a hotel foyer. Soft felt piano repeating a four-bar figure. One distant muted saxophone holding long notes. Vinyl crackle and bakelite hiss. No drums. No vocals. No choir. No melody that wants to be sung. Same texture from the first second to the last. Ready to loop.
```

### 2. `play-theme` — Ticket window

**Style** (461 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, slightly brighter than a foyer, light brushed snare far away, still sparse
```

**Lyrics** (288 / 5000)

```
[Instrumental]
[Loop bed]
Late-night jazz club just before the set. Felt piano, a little more forward. Soft clarinet in the distance. Very light brushed snare, almost felt more than heard. Vinyl crackle. No vocals. No chorus. No build. Constant gentle swing, ready to loop. Not a fanfare.
```

### 3. `lobby-theme` — Club before the show

**Style** (465 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, salon jazz, soft double bass, brushed drums very quiet, still a background bed
```

**Lyrics** (241 / 5000)

```
[Instrumental]
[Loop bed]
A small 1930s jazz salon while guests sit down. Felt piano ostinato, warm double bass, one muted trumpet far off. Soft brushes on a snare, never a fill. No vocals. No applause. No countdown. Even energy, loop-ready.
```

### 4. `night-ambient` — Velvet veil

**Style** (460 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, almost ambient, no drums, no saxophone melody, low felt piano, radio hush
```

**Lyrics** (303 / 5000)

```
[Instrumental]
[Loop bed]
Night in a closed cabinet room. Velvet and bakelite radio hush. One very low felt-piano note every few bars. Faint vinyl and distant clarinet held as a pad, not a tune. No drums. No vocals. No choir. No ticking clock. The same quiet for every listener. Seamless loop, no swell.
```

### 5. `discuss-theme` — Salon argument

**Style** (478 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, slow salon jazz, soft piano and bass, saxophone only as long pads, plenty of air for speech
```

**Lyrics** (332 / 5000)

```
[Instrumental]
[Loop bed]
A 1930s salon where people are arguing at a wooden table. Underscore only. Felt piano and warm bass, slow. Muted saxophone plays long held notes in the background, never a solo. Lots of silence between phrases so spoken voices can sit on top. No drum fills. No vocals. Constant, loop-ready, never climaxes.
```

### 6. `discuss-late` — Salon after midnight

**Style** (449 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, darker salon jazz, minor, low piano, lonely clarinet, no drums
```

**Lyrics** (257 / 5000)

```
[Instrumental]
[Loop bed]
The same wooden salon after midnight. Felt piano in a minor key, slower. Lonely clarinet, very quiet. No drums. No vocals. No horror stingers. No chase music. Still a background loop people can talk over. Even, dark, ready to loop.
```

### 7. `vote-theme` — Held breath

**Style** (454 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, tense sparse piano, no drums, no clock ticks, held muted brass pads
```

**Lyrics** (261 / 5000)

```
[Instrumental]
[Loop bed]
A tense pause in a 1930s cabinet room before a vote is counted. Sparse felt piano, one note at a time. Muted brass pad underneath. No drums. No metronome. No clock ticks. No vocals. Held breath, not a thriller cue. Seamless quiet loop.
```

### 8. `legislative-theme` — Quiet desk

**Style** (451 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, almost silent, wood and felt piano, no saxophone licks, no drums
```

**Lyrics** (274 / 5000)

```
[Instrumental]
[Loop bed]
A president's wooden desk at night. Almost silence. Soft vinyl. One felt-piano interval repeating slowly. A little room tone. No drums. No saxophone melody. No vocals. No tension riser. The quietest loop in the set. Ready to loop under card sounds.
```

### 9. `power-theme` — Cabinet seal

**Style** (449 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, low piano and clarinet, cabinet-room noir, no drums, no horror
```

**Lyrics** (311 / 5000)

```
[Instrumental]
[Loop bed]
A sealed cabinet envelope opened on a walnut desk. Low felt piano, dark but formal. Quiet clarinet. No drums. No choir. No horror movie cue. No weapon sounds suggested in the music. Grave, short-phrase, looping underscore. Same mood for inspection, a peek at papers, or an empty chair.
```

### 10. `chaos-theme` — Third failure

**Style** (452 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, low piano strings inside a wooden cabinet, no explosion, no drums
```

**Lyrics** (274 / 5000)

```
[Instrumental]
[Loop bed]
A low piano-string rumble inside a wooden cabinet, repeating. Grave, short decay, then the figure returns. No explosion. No percussion hits. No vocals. Not a sting that ends — a looping bed that can sit under a card flip. Dark, analog, 1930s radio.
```

### 11. `over-dawn` — Dawn coda

**Style** (456 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, hopeful dawn, soft brass pads, felt piano, still a loop not a fanfare
```

**Lyrics** (266 / 5000)

```
[Instrumental]
[Loop bed]
Dawn through a radio speaker. Soft felt piano and muted brass pads, hopeful but adult. No fanfare. No victory jingle. No choir. No vocals. A looping coda after the news has already been announced. Warm cream and sky-blue in sound. Seamless.
```

### 12. `over-dusk` — Dusk coda

**Style** (455 / 1000)

```
1930s Weimar late-night jazz club underscore, intimate analog recording, warm small-room reverb, faint vinyl crackle, bakelite radio hiss, felt piano, muted saxophone, clarinet, muted brass, instrumental only, seamless looping background bed, no intro swell, no ending, no fade-out, constant quiet energy, not a song with a chorus, not a cinematic trailer, not a video-game title theme, dusk, low strings and lonely clarinet, organ-adjacent pad, no anthem
```

**Lyrics** (286 / 5000)

```
[Instrumental]
[Loop bed]
Dusk in a closed cabinet. Low strings and a lonely clarinet. A dark wood organ-like pad, very quiet. Same length and shape as a hopeful dawn coda, only darker. No anthem. No march. No vocals. No villain laugh. Looping aftertaste after the news sting. Seamless.
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

Late board uses `discuss-late` **only** on discussion / nomination. Vote
and desk stay the same.

Do not add a 13th file for 30 s warn, Ja vs Nein, or a victim-only
death bed. Those are SFX, or they leak.

## Wiring

```ts
import menuThemeUrl from '../assets/sounds/music/menu-theme.mp3';

const MUSIC = {
  'menu-theme': { src: menuThemeUrl, volume: 0.3 },
};
```

| Hook | Call |
|---|---|
| `home` / `rules` / `how-to-play` / `settings` / `about` | `playMusic('menu-theme')` |
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
2. **P1 (5):** `play-theme`, `power-theme`, `chaos-theme`, `over-dawn`, `over-dusk`
3. **P2 (1):** `discuss-late`

Listen on a phone with Ravi Voice on, then off. If a bed fights
speech, lower volume before rewriting the prompt.
