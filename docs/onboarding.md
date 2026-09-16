# Onboarding — learn at the table

A hands-on first table. Video and written rules stay on the guide hub.
This is Daniel walking the player through the **real board**, then
through live matches at every size.

This file is the plan. It is not implemented yet.

**The table must feel like a table.** The other seats are scripted, but
the player is never told that. No “practice”, no “ربات”, no “these are
not real”. They have names, they sit down slowly, they chat, they
hesitate before a vote. Daniel is the only one who sounds like a guide,
and he talks **to you**, not about the others being fake.

## Why

The first five launches dump people on a video and a rulebook. They skip,
then freeze on the first nomination. Roles and three-card laws only stick
when a thumb has done them.

## Shape

A **ladder of steps**. Each step unlocks the next. Skip a step, or skip
the whole thing, any time.

| Step | Table | What they learn |
|---|---|---|
| **1. Look** | Frozen 5-seat table | Everything they will *see*: seats, boards, votes, government, the deck. Images of the real UI, one region lit, Daniel talks. |
| **2. Five** | 5-player match | The whole small table: night, nominate, vote, tracker, laws, peek, execute, how each side wins. Easy script, player is Liberal. |
| **3. Six** | 6-player match | Same board as five. Extra Liberal. Term limits when five remain. |
| **4. Seven** | 7-player match | Hitler does **not** see the Fascists. Investigate. Special election. |
| **5. Eight** | 8-player match | Same band as seven; more bodies, noisier votes. |
| **6. Nine** | 9-player match | Two investigates. Fascists are three + Hitler. |
| **7. Ten** | 10-player match | Full table. Same large board. Chaos and talk. |

Ship **step 1 + step 2** first. 6–10 are more scripts on the same
machine, not a second system.

After a match: next step, or Home / Find Match. Remember progress in
`localStorage` (`sh:onboarding-step`). A live join link or a restored
seat still wins over this, same as today.

## Principles

- **Client only.** No tutorial HTTP, no tutorial room on the server, no
  bots in Postgres. The shared `GameEngine` already has no I/O — the
  client constructs a `Room`, runs the engine in memory, and paints the
  same Game / Waiting-room screens off that snapshot. Live games stay
  server-sourced. This path never touches the wire.
- **Natural seats.** Other players have names, avatars, typing pauses.
  Chat is table talk, never “this is a lesson”. They never mention
  Daniel, the guide, or that they are scripted.
- **Daniel is the guide.** He speaks only to the viewer. While he
  teaches, a **mask** covers the rest of the table (warm smoke, not
  black) and one region stays clear and tappable.
- **One lit thing.** During a teaching beat, only the highlighted
  control works. Wrong taps do nothing; Daniel repeats. When it is an
  ordinary bot turn, the mask lifts and the table just plays.
- **Human timing.** Nothing important happens in 0.2 s. Joins, chat,
  nominations, votes, and discards sit in the **1.5–5 s** range, with
  jitter, so it feels like people thinking. See [Timing](#timing).
- **Skip is quiet.** A small cream control, not a confession that the
  table is fake. Leaving goes Home. Progress stays.
- **Copy is میز.** Spoken Iranian Persian, «شما». Night whispers stay
  close (`نقشت رو`). English is a second original. Daniel follows
  [`ravi-script.md`](./ravi-script.md).

---

## Step 1 — what you will see

Not a slideshow of posters. A **staged 5-seat table** (the real
Game-screen chrome, snapshot built on the client) with the match not
started. Daniel talks. A mask. One piece of UI is punched out and
slightly scaled / ringed so it is the only thing you can look at.

Each beat: Daniel’s line → they tap the lit thing **or** Continue →
mask moves to the next piece.

Use the **actual widgets** (seats, boards, vote cards, deck). Do not
commission a second set of illustrations. If a beat is clearer as a
still (for example a vote card in flight), freeze that frame of the
real UI — still not a separate painting.

| # | Punch-out | They learn | Daniel FA | Daniel EN | Tone |
|---|---|---|---|---|---|
| 1 | Five seats | Two teams, one Hitler, you do not know who | پنج نفر سر این میز. لیبرال‌ها بیشترن، ولی همدیگه رو نمی‌شناسن. یه فاشیست هست، هیتلر هم هست. | Five people at this table. Liberals are the majority, but they do not know each other. One Fascist, and Hitler. | `[warmly]` |
| 2 | Liberal + Fascist boards | 5 Liberal laws or 6 Fascist laws | این دو تا تخته‌ست. پنج قانون لیبرال، لیبرال‌ها می‌برن. شش قانون فاشیست، اونا می‌برن. | These two boards. Five Liberal laws and the Liberals win. Six Fascist laws and they win. | `[calm]` |
| 3 | Ja / Nein on a seat | Every hand votes | هر دست یه دولت پیشنهاد می‌شه. همه رأی می‌دن: آره یا نه. | Each round someone proposes a government. Everyone votes Ja or Nein. | `[calm]` |
| 4 | President → chancellor slot | President picks, then a vote | رئیس‌جمهور یکی رو صدراعظم می‌کنه. اگه رأی بیاره، همون دو نفر قانون می‌ذارن. | The President names a Chancellor. If the vote passes, those two put a law on the board. | `[announce]` |
| 5 | Deck / three policy tiles | 3 → burn 1 → chancellor picks 1 | رئیس‌جمهور سه کارت می‌کشه، یکی رو می‌سوزونه. صدراعظم از اون دوتای باقی‌مونده یکی رو می‌ذاره رو تخته. کسی حق نداره کارت رو نشون بده. | The President draws three, burns one. The Chancellor enacts one of the two that remain. Nobody may show the cards. | `[calm]` |

Then Daniel `onboard.letsSit`: `بریم سر میز.` / `Let's sit.` The other
four sit (slow), lobby chat, ready, start → **step 2**.

No “this is a lesson table” in these lines.

---

## Mask

Not a black dimmer and not a tutorial cartoon.

- Fill: warm smoke, roughly `rgba(12, 8, 5, 0.55)` — dark enough to
  kill contrast on the rest, still the same room.
- Hole: the target rect, 8–12 px feather, optional 1px gold ring.
- The punched-out control is the only pressable hit target.
- Ravi / Daniel plaque sits **above** the mask (never covered).
- Continue / Skip sit in the safe area, also above the mask.
- Reduce-motion: no pulse; hole still moves.

Same overlay for step 1 and for teaching beats inside a match. When
the table is just playing (a bot nominates, votes flip), **lift the
mask**.

---

## Timing

Floor for anything the player can see. Jitter so two bots never move
on the same frame.

| Event | Delay |
|---|---|
| Next player sits in lobby | 1.8–4.5 s after the previous |
| First lobby chat after sitting | 2–5 s |
| Chat after a public event (law, failed vote) | 1.8–3.8 s |
| Bot nominates | 2.5–5 s “thinking” |
| Bot vote (stagger per seat) | 1.6–4.5 s, each seat different |
| Bot burns / enacts | 2–4 s |
| After Daniel finishes, before they must tap | ~0.4 s so the clip is not cut |
| Teaching lock | Until they tap. Timers paused. |

Never 0.2 s, never a cascade of four chats in one second. If two bots
would speak, the second waits until the first line has been on screen
a beat (~1.2 s) plus their own delay.

---

## The other players

They play like people. Scripted, not an LLM. They never break character.

### Five-player cast (steps 1–2)

| Seat | Name (fa) | Name (en) | Role (step 2) | Manner |
|---|---|---|---|---|
| 0 | (player) | (player) | Liberal | Only human. First President. |
| 1 | نیما | Nima | Liberal | Calm. Short lines. Picks Liberals. |
| 2 | سارا | Sara | Liberal | Asks. Follows Nima. |
| 3 | رضا | Reza | Fascist | Sure of himself. Moves too early. |
| 4 | امید | Omid | Hitler | Quiet. Agrees. Almost never explains. |

Reuse existing avatars, fixed mapping. Later steps add seats from a
name pool (مریم, کیان, آرش, هدا, بهراد, الناز) — still real first
names, still existing portraits.

### Lobby chat (step 2) — natural, not a disclaimer

Staggered as they sit.

| Who | FA | EN |
|---|---|---|
| نیما | سلام. | Hi. |
| سارا | چند نفریم؟ | How many are we? |
| نیما | پنج. بزنید بریم. | Five. Let's go. |
| رضا | این دست من می‌برم. | I'm winning this hand. |
| امید | باشه. | Alright. |

No one says تمرین, ربات, درس, آموزش.

### In-match chat

Table colour only. If a line teaches a rule, cut it — that is Daniel.

| When | Who | FA | EN |
|---|---|---|---|
| After first Liberal law | سارا | لیبرال بود؟ | Was that a Liberal? |
| | نیما | به نظرم آره. | I think so. |
| Reza names Omid | رضا | به این اعتماد دارم. | I trust this one. |
| After that vote fails | رضا | بی‌خود نه دادید. | You voted no for nothing. |
| | نیما | زود بود. | Too soon. |
| Before you enact as chancellor | امید | موفق باشید. | Good luck. |

---

## Step 2 — five players, the whole small table

Easy on the player (always Liberal, first President). Complete for
**5–6 rules**: election, vote, tracker, three cards, peek (3rd Fascist
law), execute (4th), veto unlock (5th, show it exists — do not force a
veto puzzle), Liberal win **or** “Hitler chancellor after 3 Fascist
laws” as a scare they vote down.

Force roles: 3 Liberal, 1 Fascist, Hitler. Night is 5–6: Fascist and
Hitler see each other. The player only sees their own card. Daniel
does not say “you are safe because this is a tutorial.” He says look,
then hide.

Stacked deck so the scripted laws land. Timers paused during a teaching
lock; otherwise they run, generous.

### Teaching beats (mask on)

Player-touch is **bold**. Between them the mask lifts and the others
play like a normal table (slow).

1. Night — reuse `deal.start`, `night.start`, `night.end`. Then
   `onboard.night.done` (whisper): you are Liberal; you do not see the
   others; that is how this game is.
2. **Nominate.** `onboard.pick` — pick a chancellor. Hint Nima (Sara
   allowed). Reza / Omid: retry line, command ignored.
3. **Vote Ja.** `onboard.vote`. Others vote staggered. Reza Nein, rest
   Ja. After reveal, `onboard.votes.read` — remember who keeps saying
   no.
4. **Burn the Fascist, pass two Liberals.** `onboard.draw` (whisper).
   Nima enacts Liberal.
5. Watch a bot government (mask off). Another Liberal. Daniel
   `onboard.watch` once: this hand is not yours; watch who sits with
   whom.
6. **Vote Nein** on Reza → Omid. `onboard.refuse`. Fails. Tracker.
   `onboard.tracker`.
7. **You are Chancellor.** Enact the Liberal. `onboard.chancellor`.
8. A Fascist law lands on a bot government (stacked) until **peek**
   comes up (3rd Fascist on the 5–6 board). If the player is President
   then, `onboard.peek` — look, put them back, say nothing true you
   do not want to. If a bot is President, Daniel still names the power
   while the mask lights the power UI.
9. **Execute** (4th Fascist). `onboard.execute` — you may shoot. The
   script can have the player execute Reza (Fascist, game continues) so
   they see a role stay hidden, **or** skip shooting Hitler until they
   have seen a non-Hitler death. Do not end the lesson in one tap
   unless the step is already complete.
10. Fill Liberal laws to a Liberal win, or one more watched round.
    `onboard.win` — Liberals win; at the next table nobody narrates the
    lie. Listen to who talks.

Wrong tap: Daniel repeats, state does not advance.

Exact tile order and who is President on the peek/execute hands can
move during implementation; the **list of mechanics** for five must
all happen once.

---

## Steps 3–7 — six through ten

Same client machine, new script. Each step only **adds what that count
changes**. Do not replay the five-player lecture.

| Step | Count | Mix | Night | Board (Fascist slots 1→5) | Teach |
|---|---|---|---|---|---|
| 3 | 6 | 4 Lib, 1 Fas, Hitler | Same as 5: Fascists + Hitler open eyes | — — peek, execute, execute+veto | Extra Liberal. When five remain, only last chancellor is ineligible. |
| 4 | 7 | 4 Lib, 2 Fas, Hitler | Fascists see Hitler; **Hitler does not see them** | — investigate, special election, execute, execute+veto | Closed-eye Hitler. Investigate = party card, not role. Special election. |
| 5 | 8 | 5 Lib, 2 Fas, Hitler | Same as 7 | Same as 7 | Bigger vote. Two Fascists talking around a blind Hitler. |
| 6 | 9 | 5 Lib, 3 Fas, Hitler | Same as 7 | investigate, investigate, special election, execute, execute+veto | Two investigates. Three Fascists. |
| 7 | 10 | 6 Lib, 3 Fas, Hitler | Same as 7 | Same as 9 | Full table. Noise. Same powers, more seats. |

Player role can stay Liberal for the easy path. A later “other side”
sitting (you are Fascist / Hitler) is a separate ladder, not mixed
into these steps.

Write full beat lists for 6–10 when step 2 is playable. Until then this
table is the contract.

---

## Daniel — new clips

Live-table lines (`deal.start`, `vote.passed`, …) stay. Guide lines are
`onboard.*` so a real server game never speaks them.

Audio: Daniel, FA takes. EN is subtitle until we record it.

Do not use the word تمرین / practice / bot / ربات in any of these.

| Id | Tone | FA | EN |
|---|---|---|---|
| `onboard.sit` | warmly | بشینید. از روی میز نشون می‌دم. | Sit. I'll show you from the table. |
| `onboard.idea.table` | warmly | *(step 1 #1)* | |
| `onboard.idea.boards` | calm | *(step 1 #2)* | |
| `onboard.idea.vote` | calm | *(step 1 #3)* | |
| `onboard.idea.government` | announcing | *(step 1 #4)* | |
| `onboard.idea.laws` | calm | *(step 1 #5)* | |
| `onboard.letsSit` | warmly | بریم سر میز. | Let's sit. |
| `onboard.night.done` | whispering | شما لیبرالید. بقیه رو نمی‌بینید. همین درسته. | You are a Liberal. You do not see the others. That is the point. |
| `onboard.pick` | calm | یه صدراعظم انتخاب کنید. نیما آرومه. از اونجا شروع کنید. | Pick a Chancellor. Nima is calm. Start there. |
| `onboard.pick.retry` | down | این یکی رو برای این دست نه. یکی دیگه. | Not that one for this hand. Someone else. |
| `onboard.vote` | calm | کارت رأی‌تون رو بزنید. این دولت رو می‌خواید — آره. | Tap your vote. You want this government — Ja. |
| `onboard.votes.read` | firm | رضا نه گفت. یکی که هی نه می‌ده، یادتون بمونه. | Reza said Nein. Remember who keeps saying no. |
| `onboard.draw` | whispering | سه تا قانون اومد دستتون. فاشیسته رو بسوزونید. دوتای لیبرال می‌ره برای نیما. | Three laws in your hand. Burn the Fascist. The two Liberals go to Nima. |
| `onboard.watch` | calm | این دست شما نیستید. ببینید کی با کی می‌شینه. | This hand is not yours. Watch who sits with whom. |
| `onboard.refuse` | firm | رضا امید رو گذاشت. خیلی زود با هم کنار اومدن. نه بدید. | Reza named Omid. They lined up too fast. Vote Nein. |
| `onboard.tracker` | down | دولت نیاورد. اون شُمارَنده یکی رفت بالا. سه بار پشت هم نشه، از رو دسته قانون می‌آد. | The government failed. The tracker moved up. Three in a row and a law comes off the top of the deck. |
| `onboard.chancellor` | whispering | حالا صدراعظمید. از این دوتا یکی رو می‌ذارید رو تخته. لیبرال رو بذارید. | You are Chancellor now. You enact one of these two. Put the Liberal down. |
| `onboard.peek` | whispering | سه تای بالای دسته رو ببینید. سر جاشون برگردونید. به میز دروغ بگید اگه لازم شد. | Look at the top three. Put them back. Lie to the table if you have to. |
| `onboard.execute` | grave | یه نفر رو از میز بردارید. اگه هیتلر باشه، لیبرال‌ها می‌برن. نقشش رو کسی نمی‌بینه مگر اینکه هیتلر باشه. | Take someone off the table. If it is Hitler, the Liberals win. Nobody sees the role unless it is Hitler. |
| `onboard.win` | warmly | لیبرال‌ها بردن. دست بعد کسی بهتون نمی‌گه کی دروغ می‌گه. گوش کنید کی حرف می‌زنه. | The Liberals win. Next hand nobody tells you who is lying. Listen to who talks. |
| `onboard.nextSix` | calmly | … | *(write when step 3 is designed)* |

Add these to [`ravi-script.md`](./ravi-script.md) when we implement. No
second script file.

First-run plaque (if we ask before sitting) — still no bots:

- FA: قبل از میز، یه دست بزنید. از روی همون تخته نشون می‌دم.
- EN: Before you sit down for real, play a hand. I'll show you from that same board.

---

## Design

- Same Game screen and Waiting room. No classroom chrome, no “step 3/12”
  bar. Boards filling is the progress.
- Mask as above. Pulse on the punched-out control (`transform` /
  `opacity` only).
- Continue: brass chip. Skip: quiet cream, not a second primary.
- **No Practice pill.** No robot badge on seats.
- Phone 430 px. Overlay must not cover the punched-out control.
- Press, not hover.

---

## Assets

| Need | New? | Notes |
|---|---|---|
| Seats, boards, cards, votes, deck | No | Real table. Step 1 *is* those widgets. |
| Portraits | No | Existing avatars, fixed names. |
| Daniel cameo | No | Current Ravi dock. |
| Mask + hole + gold ring | CSS | Not a PNG. Not `#000`. |
| Continue / Skip | Existing buttons | |
| Daniel `onboard.*` mp3 | **Yes** | FA takes. ~20 for steps 1–2; more per later count. |
| Hand pointer | Maybe later | Pulse first. |
| Separate “UI photos” | **No** unless a beat cannot freeze a real widget. |

No DALL·E pass for v1.

---

## Architecture — client only

Live matches stay on the server. Onboarding never opens a socket and
never `POST`s a room.

```
client/src/tutorial/
  TutorialService.ts     owns Room + GameEngine, drives the director
  TutorialDirector.ts    timed seat actions + chat, human delays
  Spotlight.tsx          mask + hole + lock
  scripts/look.ts        step 1 beats
  scripts/five.ts        step 2
  scripts/six.ts … ten.ts  later

shared/                  GameEngine, Room.viewFor, stacked deck — unchanged
                         (optional: a TutorialScript type if it stays pure)

GameStateService         tutorial path feeds the same view() the live
                         socket would; GameScreen does not know
```

- Construct `Room` + `GameEngine` in the client with a stacked deck and
  a seeded role bag.
- Local player commands go `engine.handle(youId, command)` directly.
- Director calls `engine.handle(botId, command)` after the delays
  above.
- `Room.viewFor(youId)` is the snapshot. Role hiding still works:
  the player must not see Fascist night.
- Chat is appended on the room the same way the engine already logs
  talk — or a small parallel list on the tutorial service if chat is
  socket-only today. Do not invent a server chat HTTP for this.
- GameOver, night overlay, vote cards: the real components.
- `flags.tutorial` ships dark, then on. First-run in
  `TutorialPromptService` offers step 1 instead of only the video hub.

This is the one place the client mutates a `Room`. It is a closed box.
A tutorial table is never published, never in match history, never a
friend-request source.

Tests live next to the director and scripts (`it('Should …')`). Engine
rules stay covered by existing shared tests; tutorial tests lock the
script (Nima/Sara for the first chancellor, Reza ticket fails, peek
happens, …).

---

## Out of the first ship

- Steps 6–10 scripts (stubs + the table above are enough until five
  plays well).
- Playing as Fascist / Hitler.
- Voice chat.
- LLM seats.
- Mid-step crash resume (seven minutes; start the step over).

---

## Build order

### Step 1 + plumbing

- [ ] `TutorialService` holds an in-memory engine; `view()` matches
      what GameScreen already reads.
- [ ] Spotlight / mask; punch-out from the current beat.
- [ ] Step 1 beat list + Daniel lines in i18n + `ravi-script.md`.
- [ ] First-run: Sit / Not now. Skip. `sh:onboarding-step`.
- [ ] Tests: five punch-outs in order; Skip leaves.

### Step 2

- [ ] `scripts/five.ts`: roles, stack, beats, chat, delays.
- [ ] Director: sit, chat, nominate, vote, legislate, powers — all
      with 1.5–5 s jitter. No 0.2 s.
- [ ] Teaching locks; off-script taps ignored + retry line.
- [ ] Peek + execute happen once; Liberal win.
- [ ] No “bot/practice” copy anywhere in fa/en.
- [ ] Tests for the scripted ticket, the failed Reza government, win.

### Voice

- [ ] Record Daniel `onboard.*` FA.
- [ ] Subtitles work with voice off.

### Later counts

- [ ] `six.ts` … `ten.ts` as in the table.
- [ ] Guide hub: continue from last unfinished step.

### Ship

- [ ] `flags.tutorial` off, then playtest on 430 px in Bale.
- [ ] Changelog when players can see it. Flip the flag.

---

## Open questions

1. Sit / Not now before step 1, or straight onto the masked table?
   Sit / Not now.
2. EN audio in v1? Subtitles only.
3. First chancellor: force Nima, or allow Sara too? Allow Sara.
4. Execute in step 2: shoot a Fascist (game continues) vs shoot Hitler
   (instant Liberal win). Prefer Fascist first so execute is a lesson,
   not the ending.

When this ships, video and written rules stay as the appendix. The
table is the lesson — and it should feel like a table.
