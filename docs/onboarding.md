# Onboarding — learn by sitting

A hands-on first table. Not the video, not the written guide. Those stay
on the guide hub for people who want them. This is the path a new player
walks **once**, on the real board, with Daniel talking.

This file is the plan. It is not implemented yet.

## Why this, not more pages

The first five launches already dump people on **Watch the tutorial** and
**Read the rules**. Most skip. The ones who read still freeze on the first
nomination: they know there is a Hitler, they do not know which button is
theirs.

Secret Hitler is learned with thumbs. Roles, votes, three cards — those
only stick when the player has done them. Reading “the President discards
one” is not the same as burning a tile.

So: **spotlight the real UI, one idea at a time, then play a short 5-seat
match against scripted bots.** About seven minutes. Skip any time.

## Shape

Two acts, one sitting. No extra “lesson world” art. Same waiting room,
same table, same Ravi dock.

| Act | Where | Time | What |
|---|---|---|---|
| **1. Museum** | Frozen table, dimmed, one thing lit | ~90 s | Five ideas. Tap to continue. |
| **2. Hand** | Live 5-player match, 4 bots | ~5–6 min | Player is a Liberal. Real commands. Stacked deck. Scripted bot talk and votes. Liberals win on five Liberal laws. |

After the win overlay: “You can sit at a real table now.” Home, Find
Match, or Play with friends.

Do **not** teach Fascist night, Hitler-as-Chancellor, peek, execute,
veto, or 7–10 “Hitler keeps eyes closed” in v1. One honest Liberal seat
is the whole first lesson. A second sitting (“the other side”) can come
later.

## Principles

- **Server still owns the match.** Act 2 is a real room and a real
  `GameEngine`. Bots send the same `ClientMessage`s a person would. The
  Game screen does not grow a tutorial mode full of fake snapshots.
- **The script owns the bots.** No LLM at the table. Same lines every
  run, like Ravi. Chat, votes, nominees, discards are a beat list.
- **Player is always Liberal, seat 0, first President.** Fixed roles so
  the night card and the first pick never surprise the lesson.
- **Daniel talks. Bots type.** Ravi explains the rule. Bot chat is
  table colour (“this one is eager”, “this one is quiet”) — not a second
  narrator.
- **One lit control.** During a teaching pause the rest of the table is
  dim. Only the thing they must tap is pressable. Wrong taps do nothing.
- **Skip is always there.** Skip Act 1 → sit at the practice table.
  Skip Act 2 → home. Leaving the room counts as skip. Remember
  completion in `localStorage` (`sh:onboarding-done`). First-run still
  offers this **before** the video/text hub, once.
- **Copy is میز.** Spoken Iranian Persian, «شما», same as the table.
  Night whispers stay close (`نقشت رو`). English is a second original.
  Daniel clips follow [`ravi-script.md`](./ravi-script.md) (TTS
  spellings, one breath, no jokes).

## Entry

Replace the first-run dump onto the guide hub.

1. Splash.
2. If onboarding is not done, and they are not joining a live seat:
   start Act 1 (or a one-line “A practice table is waiting. Sit?” with
   **Sit** / **Not now**).
3. Guide hub keeps video + written rules. Add a third card later:
   **Practice table** — replays this flow.
4. Home does not need a new chip in v1. Replays live on the guide hub.

A live join link or a restored seat still wins over this, same as today.

---

## Act 1 — five spotlights

Stage a 5-seat table in lobby (bots already seated, not started). Dim
the shell. A gold plaque + Daniel. After each line, **Continue** or tap
the highlighted thing.

Do not invent a new screen. Overlay on `WaitingRoomScreen` / a parked
`GameScreen` snapshot — whichever already shows seats + both boards.
Prefer the **game table chrome** so the lights land on the real
widgets.

| # | Light | They learn | Daniel (FA) | Daniel (EN) | Tone |
|---|---|---|---|---|---|
| 1 | Whole table, five seats | Two teams, one Hitler, you do not know who | این یه میز تمرینه. پنج نفر. لیبرال‌ها بیشترن، ولی همدیگه رو نمی‌شناسن. یه فاشیست هست، هیتلر هم هست. | This is a practice table. Five people. Liberals are the majority, but they do not know each other. One Fascist, and Hitler. | `[warmly]` |
| 2 | Liberal + Fascist boards | 5 Liberal laws or 6 Fascist laws | این دو تا تخته‌ست. پنج قانون لیبرال، لیبرال‌ها می‌برن. شش قانون فاشیست، اونا می‌برن. | These two boards. Five Liberal laws and the Liberals win. Six Fascist laws and they win. | `[calm]` |
| 3 | A Ja / Nein on one seat | Every hand votes | هر دست یه دولت پیشنهاد می‌شه. همه رأی می‌دن: آره یا نه. | Each round someone proposes a government. Everyone votes Ja or Nein. | `[calm]` |
| 4 | President placard → empty chancellor slot | President picks a chancellor | رئیس‌جمهور یکی رو صدراعظم می‌کنه. اگه رأی بیاره، همون دو نفر قانون می‌ذارن. | The President names a Chancellor. If the vote passes, those two put a law on the board. | `[announce]` |
| 5 | Policy tiles / deck strip | 3 cards → burn 1 → chancellor picks 1 | رئیس‌جمهور سه کارت می‌کشه، یکی رو می‌سوزونه. صدراعظم از اون دوتای باقی‌مونده یکی رو می‌ذاره رو تخته. کسی حق نداره کارت رو به بقیه نشون بده. | The President draws three, burns one. The Chancellor enacts one of the two that remain. Nobody may show the cards. | `[calm]` |

Then Daniel: `بریم سر میز.` / `Let's sit.` Start the match (Act 2).

Act 1 has **no new illustrations**. Highlight existing seats, boards,
deck. A CSS spotlight (radial hole in a dim overlay) + the existing
Ravi plaque is enough.

---

## Act 2 — the practice match

### Table

| Seat | Name (fa) | Name (en) | Role | How they play |
|---|---|---|---|---|
| 0 | (player) | (player) | Liberal | Only human. First President. |
| 1 | نیما | Nima | Liberal | Calm. Picks other Liberals. Votes Ja on honest governments. |
| 2 | سارا | Sara | Liberal | Asks in chat. Follows Nima. |
| 3 | رضا | Reza | Fascist | Too sure. Nominates Omid too early. Votes Nein on Liberal tickets. |
| 4 | امید | Omid | Hitler | Quiet. Agrees. Never explains. |

Avatars: reuse four existing portraits. Do not draw new faces. Names
are fixed so Daniel and chat stay in sync.

Show a small **Practice** pill in the waiting-room header so they never
think these are live people. When the match starts, the pill can stay
on the table chrome.

### Engine

- Room option `tutorial: true` (not a public table, not listed on Join,
  not written to history as a ranked game — or write it tagged so it
  does not pollute match history).
- `minPlayers: 5`, timers **on** but generous, or paused during a
  teaching lock.
- **Stacked deck** so the first governments can enact Liberal laws when
  the script needs them, and so Reza cannot accidentally win.
- Role deal is forced: seat 0 Liberal, 1 Liberal, 2 Liberal, 3 Fascist,
  4 Hitler. Night for 5–6: Fascist and Hitler see each other — the
  player is Liberal so they only see their own card. That is the
  lesson: *you do not see the others.*
- A `TutorialDirector` on the server: on each engine event, if the next
  beat is a bot action, send it after a short delay (600–1200 ms). If
  the next beat is the player, lock everyone else and wait. If they
  pick the wrong nominee / wrong vote, Ravi repeats, command is
  rejected until they tap the scripted one — **except** where the
  script says “any Liberal” (first chancellor: Nima or Sara).

Wrong first chancellor: if they pick Reza or Omid, Daniel:
`این یکی رو برای دست اول نه. یکی دیگه.` / `Not that one for the first
hand. Someone else.` Engine ignores the command.

### Teaching locks

While Daniel is speaking a new idea, freeze inputs except **Continue**.
Then unlock only the highlighted control. Bot chat can still appear so
the table feels alive.

### Beats

Player-touch beats are **bold**. Bot-only beats are fast: votes flip,
a law lands, Daniel says one line, next.

#### Waiting room (before start)

Bots sit one by one (~0.4 s apart). Chat, then auto-ready, then start.

| Who | Chat FA | Chat EN |
|---|---|---|
| نیما | سلام. این دست تمرینه، نگران نباشید. | Hi. This hand is practice, don't worry. |
| سارا | پس رأی‌ها جدی نیست؟ | So the votes aren't for real? |
| نیما | جدی‌یه. فقط آدم‌ها رباتن. | They're real. Only the people are bots. |
| رضا | من که برنده‌م. بزنید بریم. | I'm winning this. Let's go. |
| امید | …باشه. | …Alright. |

Daniel `onboard.lobby`:
- FA: چهار نفر دیگه سر میزن. اینا بازیکن واقعی نیستن. حرفاشون نوشته شده. شما لیبرالید — نقشتون رو که دیدید، قایمش کنید.
- EN: Four others at the table. They are not real players. Their lines are written. You are a Liberal — when you see your role, hide it.
- Tone: `[warmly]`

#### Night

Reuse `deal.start`, `night.start` / `deal.look`, `night.end`. After
hide: extra line `onboard.night.done`.

- FA: شما لیبرالید. بقیه رو نمی‌بینید. همین درسته.
- EN: You are a Liberal. You do not see the others. That is the point.
- Tone: `[whispering]`

#### Round 1 — you are President **(player)**

1. `president.first` (existing). Spotlight your seat.
2. `onboard.pick`:
   - FA: یه صدراعظم انتخاب کنید. نیما آرومه. از اونجا شروع کنید.
   - EN: Pick a Chancellor. Nima is calm. Start there.
   - Tone: `[calm]`
3. Player nominates **نیما** (سارا allowed). Reza/Omid blocked with the
   retry line above.
4. Vote lock. `onboard.vote`:
   - FA: کارت رأی‌تون رو بزنید. این دولت رو می‌خواید — آره.
   - EN: Tap your vote. You want this government — Ja.
   - Tone: `[calm]`
5. Player must vote Ja. Bots: Nima Ja, Sara Ja, Reza Nein, Omid Ja.
6. After reveal, `onboard.votes.read`:
   - FA: رضا نه گفت. یکی که هی نه می‌ده، یادتون بمونه.
   - EN: Reza said Nein. Remember who keeps saying no.
   - Tone: `[firm]`
7. Legislative. Stack: Liberal, Liberal, Fascist. `onboard.draw`:
   - FA: سه تا قانون اومد دستتون. فاشیسته رو بسوزونید. دوتای لیبرال می‌ره برای نیما.
   - EN: Three laws in your hand. Burn the Fascist. The two Liberals go to Nima.
   - Tone: `[whispering]`
8. Player discards the Fascist. Nima enacts a Liberal (bot, short
   delay). Board: 1 Liberal.

Sara chat: `نیما لیبرال گذاشت؟` / `Did Nima put a Liberal down?`
Nima chat: `آره.` / `Yes.`

#### Round 2 — watch **(bots)**

Nima President, nominates Sara, all Ja except Reza Nein, Liberal
enacted. Daniel `onboard.watch`:

- FA: این دست شما نیستید. فقط ببینید کی با کی می‌شینه.
- EN: This hand is not yours. Just watch who sits with whom.
- Tone: `[calm]`

Board: 2 Liberal.

#### Round 3 — refuse a bad ticket **(player votes)**

Reza President, nominates Omid. `onboard.refuse`:

- FA: رضا، امید رو گذاشت. خیلی زود با هم کنار اومدن. نه بدید.
- EN: Reza named Omid. They lined up too fast. Vote Nein.
- Tone: `[firm]`

Player must Nein. Bots: Nima Nein, Sara Nein, Reza Ja, Omid Ja. Vote
fails. Tracker 1. Existing `vote.failed` / tracker Ravi. Extra
`onboard.tracker`:

- FA: دولت نیاورد. اون شُمارَنده یکی رفت بالا. سه بار پشت هم نشه، وگرنه از رو دسته قانون می‌آد.
- EN: The government failed. The tracker moved up. Three in a row and a law comes off the top of the deck.
- Tone: `[down]`
- Audio: use the TTS spelling `شُمارَنده` from the Ravi script.

Reza chat: `بی‌خود نه دادید.` / `You voted no for nothing.`
Nima chat: `زود بود.` / `Too soon.`

#### Round 4 — you are Chancellor **(player)**

Presidency lands on Sara, she nominates **you**. Auto-pass (player
Ja). Stack: Liberal, Fascist. `onboard.chancellor`:

- FA: حالا صدراعظمید. از این دوتا یکی رو می‌ذارید رو تخته. لیبرال رو بذارید.
- EN: You are Chancellor now. You enact one of these two. Put the Liberal down.
- Tone: `[whispering]`

Player enacts Liberal. Board: 3 Liberal.

#### Round 5 — finish **(bots, then you if needed)**

Keep it short: Nima President, nominates Sara, Liberal. Board: 4.
Then you President again, pick Nima, stacked two Liberals + one
Fascist, burn Fascist, Nima enacts Liberal. **Liberals win.**

If that is too many taps, collapse round 5 to one watched Liberal and
one player enact. The win must be **five Liberal policies**, so they
see the board fill. Do not execute Hitler in v1 — that is a different
lesson.

Game-over overlay, then `onboard.win`:

- FA: لیبرال‌ها بردن. سر میز واقعی، کسی بهتون نمی‌گه کی دروغ می‌گه. گوش کنید کی حرف می‌زنه.
- EN: The Liberals win. At a real table nobody tells you who is lying. Listen to who talks.
- Tone: `[warmly]`

Buttons: **Find Match** / **Home**. Mark onboarding done.

---

## Daniel clip list (new)

Existing night / president / vote / law / win lines stay. New ids are
`onboard.*` so the live table never speaks them.

Record in **Daniel** only (current table voice). Subtitles in both
locales; audio is the FA take, same as the rest of Ravi.

| Id | Tone | FA (one breath unless noted) | EN |
|---|---|---|---|
| `onboard.sit` | warmly | یه میز تمرین منتظره. بشینید، نشون می‌دم. | A practice table is waiting. Sit, I'll show you. |
| `onboard.skip` | calm | *(no clip — UI only)* | |
| `onboard.idea.table` | warmly | *(Act 1 #1)* | |
| `onboard.idea.boards` | calm | *(Act 1 #2)* | |
| `onboard.idea.vote` | calm | *(Act 1 #3)* | |
| `onboard.idea.government` | announcing | *(Act 1 #4)* | |
| `onboard.idea.laws` | calm | *(Act 1 #5)* | |
| `onboard.letsSit` | warmly | بریم سر میز. | Let's sit. |
| `onboard.lobby` | warmly | *(waiting room)* | |
| `onboard.night.done` | whispering | شما لیبرالید. بقیه رو نمی‌بینید. همین درسته. | You are a Liberal. You do not see the others. That is the point. |
| `onboard.pick` | calm | یه صدراعظم انتخاب کنید. نیما آرومه. از اونجا شروع کنید. | Pick a Chancellor. Nima is calm. Start there. |
| `onboard.pick.retry` | down | این یکی رو برای دست اول نه. یکی دیگه. | Not that one for the first hand. Someone else. |
| `onboard.vote` | calm | کارت رأی‌تون رو بزنید. این دولت رو می‌خواید — آره. | Tap your vote. You want this government — Ja. |
| `onboard.votes.read` | firm | رضا نه گفت. یکی که هی نه می‌ده، یادتون بمونه. | Reza said Nein. Remember who keeps saying no. |
| `onboard.draw` | whispering | سه تا قانون اومد دستتون. فاشیسته رو بسوزونید. دوتای لیبرال می‌ره برای نیما. | Three laws in your hand. Burn the Fascist. The two Liberals go to Nima. |
| `onboard.watch` | calm | این دست شما نیستید. فقط ببینید کی با کی می‌شینه. | This hand is not yours. Just watch who sits with whom. |
| `onboard.refuse` | firm | رضا، امید رو گذاشت. خیلی زود با هم کنار اومدن. نه بدید. | Reza named Omid. They lined up too fast. Vote Nein. |
| `onboard.tracker` | down | دولت نیاورد. اون شُمارَنده یکی رفت بالا. سه بار پشت هم نشه، وگرنه از رو دسته قانون می‌آد. | The government failed. The tracker moved up. Three in a row and a law comes off the top of the deck. |
| `onboard.chancellor` | whispering | حالا صدراعظمید. از این دوتا یکی رو می‌ذارید رو تخته. لیبرال رو بذارید. | You are Chancellor now. You enact one of these two. Put the Liberal down. |
| `onboard.win` | warmly | لیبرال‌ها بردن. سر میز واقعی، کسی بهتون نمی‌گه کی دروغ می‌گه. گوش کنید کی حرف می‌زنه. | The Liberals win. At a real table nobody tells you who is lying. Listen to who talks. |

~18 new clips. Bake like the rest of the catalog. Until audio exists,
subtitles still play (same as missing Ravi files today).

Add the FA/EN strings to [`ravi-script.md`](./ravi-script.md) when
implementation starts — do not fork a second script file.

## Bot chat pack

Short. Table talk. No teaching. If a line explains a rule, it is
Daniel’s job; cut the chat.

Waiting-room lines are above. In-match extras (optional, one per beat
max):

| Beat | Who | FA | EN |
|---|---|---|---|
| After round 1 law | سارا | نیما لیبرال گذاشت؟ | Did Nima put a Liberal down? |
| | نیما | آره. | Yes. |
| After failed Reza ticket | رضا | بی‌خود نه دادید. | You voted no for nothing. |
| | نیما | زود بود. | Too soon. |
| Before player chancellor | امید | …موفق باشید. | …Good luck. |

No voice for bots. Text in the existing table chat. Do not add bubble
art.

---

## Design

### Spotlight overlay

- Full-screen dim (`rgba(4, 12, 22, 0.72)`), hole cut with a radial
  gradient or a masked rect around the target (seat, board, vote card,
  Continue).
- Gold 1px ring on the target. `pressable` pulse on the control
  (opacity / scale, no new keyframe language — `transform` + `opacity`
  only).
- Ravi plaque stays where it already lives. Do not build a second
  speech bubble.
- **Continue** is the same brass chip language as Home’s guide chip.
  **Skip** is quiet, cream, under it — not a second primary.

### Practice pill

Tiny brass label: `تمرین` / `Practice`. Waiting-room header, and once
on the table so a screenshot cannot be mistaken for a live ranked
match.

### First-run card (pre Act 1)

If we keep a confirm before sitting: one plaque, Hitler-desk lighting,
two actions. No video thumbnail. Copy:

- FA: قبل از میز واقعی، یه دست تمرین بزنید. چهار ربات هستن، دانیال نشون می‌ده چی کار کنید.
- EN: Before a real table, play one practice hand. Four bots, Daniel shows you what to do.

### What not to design

- A cartoon classroom.
- Bot nameplates that look like a ninth UI.
- A progress bar of “step 3/12”. The table *is* the progress (boards
  filling).
- Hover tooltips. Thumbs only.

Phone column 430 px. Overlay must not cover the highlighted control.
Safe-area on Skip / Continue.

---

## Assets

Almost nothing new. That is the point.

| Need | New? | Notes |
|---|---|---|
| Seat portraits | No | Four existing avatars, fixed mapping. |
| Boards, cards, votes, deck | No | Real table art. |
| Ravi / Daniel portrait | No | Current cameo. |
| Spotlight, dim, gold ring | CSS | No PNG. |
| Practice pill | CSS + i18n | |
| Continue / Skip | Existing buttons | |
| Daniel `onboard.*` mp3 | **Yes** | ~18 FA takes. EN is subtitle-only until we record EN. |
| Waiting-room sit animation | No | Seats already appear. Stagger bot joins. |
| Finger / hand pointer | **Maybe** | Skip in v1; the pulse on the control is enough. Add a small hand only if playtests miss the vote card. |
| Win stinger | No | Existing Liberal-win overlay + `onboard.win`. |
| History / ELO | No | Do not record this table as a normal match, or tag `tutorial`. |

No DALL·E pass. If a hand pointer is needed later, one small ink PNG,
no letters in the file ([`assets-brief.md`](./assets-brief.md)).

---

## Architecture (when we build)

Keep it boring and on the existing rails.

```
shared/   TutorialScript (beats, forced roles, stacked tiles, bot lines)
server/   TutorialDirector — sits on the room, feeds bot ClientMessages
          POST /api/tutorial/start  → create room, seat player + 4 bots
client/   Spotlight overlay on Game / Waiting room
          TutorialPromptService offers this instead of (or before) the hub
i18n      onboard.* plaques + bot chat keys (fa + en)
ravi      onboard.* ids in ravi-script.md → fa.ts/en.ts → mp3
flag      flags.tutorial  (ship dark, then on)
```

- Bots are server-side. They never open a WebSocket as a browser. The
  director calls `engine.handle(botId, command)` on a timer.
- Chat: director appends scripted chat messages onto the room log the
  same way a player would.
- Client only knows `room.options.tutorial` so it can show the pill,
  the spotlight target (`tutorialBeat` on the snapshot — **or** a
  parallel `tutorial:highlight` field on `viewFor`). Prefer a small
  field on the snapshot over a second channel.
- Do not run the engine on the client.

Tests: director beat list vs a stacked deck (server), overlay lock
(client), “wrong nominee is ignored” (server).

---

## Out of v1

- Play as Fascist / Hitler.
- Investigate, peek, execute, special election, veto.
- 7–10 night (Hitler does not know the Fascists).
- Voice chat.
- Adaptive bots (they always do the script).
- Saving a mid-lesson and restoring after kill-app — nice, not needed
  if the lesson is seven minutes. Crash → start over from Act 1 or
  skip.

## Second sitting (later)

A second script: player is the Fascist, night they see Hitler, they
must lie on a vote and burn a Liberal. Only after v1 completion. Do
not merge it into the first seven minutes.

---

## Build order (todo)

Work top to bottom. Each line is a shippable slice.

### Copy and script

- [ ] Lock Act 1 lines and Act 2 beats in this file (edit here first).
- [ ] Add `onboard.*` to `docs/ravi-script.md` (FA + EN + tone).
- [ ] Bot chat keys in `fa.ts` / `en.ts` (میز, not a translation).
- [ ] First-run plaque + Practice pill + Skip / Continue / Sit.

### Table script (shared + server)

- [ ] `TutorialScript`: forced roles, stacked tiles, beat list.
- [ ] `POST /api/tutorial/start` seats 5, `tutorial: true`, not public.
- [ ] `TutorialDirector`: bot joins, ready, start, timed commands.
- [ ] Reject off-script player commands with a Ravi retry, not a toast
      soup.
- [ ] Do not persist this game into normal match history (or tag it).
- [ ] Tests: first chancellor must be Nima/Sara; Reza ticket fails;
      five Liberal laws win.

### Client UI

- [ ] First-run: offer practice table instead of only video/text.
- [ ] Spotlight overlay + highlight target from snapshot.
- [ ] Freeze unrelated controls during a lock.
- [ ] Practice pill on waiting room and table.
- [ ] Guide hub card to replay.
- [ ] `sh:onboarding-done` after win or skip.
- [ ] Tests: Sit starts the room; Skip goes home; highlight is on the
      nominate control in beat `pick`.

### Voice

- [ ] Record Daniel `onboard.*` FA clips.
- [ ] Wire through `RaviService` / SoundService the same as live lines.
- [ ] Subtitles work with voice off.

### Flag and ship

- [ ] `flags.tutorial` default off.
- [ ] Playtest on a 430 px phone in Bale: seven minutes, no stuck lock.
- [ ] Changelog line when it is on for players.
- [ ] Flip the flag.

---

## Open questions

1. **First-run confirm, or straight into Act 1?** Straight in is
   braver. A Sit / Not now plaque is kinder on repeat installs. Lean
   Sit / Not now.
2. **Record EN audio?** Live table is FA-first. Subtitles are enough
   for v1 EN.
3. **Match history:** hide tutorial games. They are not “your tables”
   for friend requests.
4. **Timers:** pause during Daniel, or 60 s so a slow reader is not
   kicked. Pause is better.
5. **Name the bots in settings?** No. Fixed cast.

When this ships, the video and the written guide stay. They become the
appendix. The practice table is the lesson.
