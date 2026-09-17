# Onboarding — learn at the table

A hands-on first table. Video and written rules stay on the guide hub.
This is Daniel walking the player through the **real board**, then
through live matches at every size.

This file is the plan. Steps 0–7 are in the client (intro slides → look
→ five, then 6–10 as **difference-only** sittings). Daniel is header text
only — no `onboard.*` clips yet. Ships dark behind `FEATURE_ONBOARDING`
(default off).

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
| **0. Pieces** | Full-page slides | What each thing *is* — role cards, boards, offices, vote cards, tracker, deck, laws. Short labels only. |
| **1. How to play** | Frozen 5-seat table | The table, who sits, the boards, how talk gets you named Chancellor. Not a recap of every piece. |
| **2. Five** | 5-player match | The whole small table: night, nominate, vote, tracker, laws, peek, execute, how each side wins. Easy script, player is Liberal. |
| **3. Six** | 6-player match | Same board as five. Extra Liberal. Term limits when five remain. |
| **4. Seven** | 7-player match | Hitler does **not** see the Fascists. Investigate. Special election. |
| **5. Eight** | 8-player match | Same band as seven; more bodies, noisier votes. |
| **6. Nine** | 9-player match | Two investigates. Fascists are three + Hitler. |
| **7. Ten** | 10-player match | Full table. Same large board. Chaos and talk. |

Ship **step 0 + 1 + 2** first. 6–10 reuse the same machine and only
teach what that count **adds** — term limits, Hitler-blind night,
investigate, special election, two investigates, full table. Do not
replay the five-player lecture.

After a match: next step, or Home / Join. Remember progress in
`localStorage` (`sh:onboarding-step`). Sit / Skip declines live in
`sh:onboarding-declines` — not the old rules-hub `sh:tutorial-seen-count`.
A live join link or a restored seat still wins over this, same as today.

## Principles

- **Client only.** No tutorial HTTP, no tutorial room on the server, no
  bots in Postgres. The shared `GameEngine` already has no I/O — the
  client constructs a `Room`, runs the engine in memory, and paints the
  same Game / Waiting-room screens off that snapshot. Live games stay
  server-sourced. This path never touches the wire. Showing it is still
  gated by `FEATURE_ONBOARDING` so production can stay dark.
- **Natural seats.** Other players have names, avatars, typing pauses.
  Chat is table talk, never “this is a lesson”. They never mention
  Daniel, the guide, or that they are scripted.
- **Daniel is the guide.** He speaks only to the viewer. While he
  points at a widget, a **mask** covers the rest of the table (warm
  smoke, not black) and that region stays clear. When he is talking
  about the whole room, there is no mask hole.
- **One lit thing — or none.** During a teaching beat, only the
  highlighted control works. Wrong taps do nothing; Daniel repeats.
  **Some beats have no highlight.** If Daniel is talking about the
  whole table, lift the mask: no gold ring, no punched-out seat, no
  office ribbon that looks like a pick. When it is an ordinary bot
  turn, the mask lifts and the table just plays.
- **Human timing.** Nothing important happens in 0.2 s. Joins, chat,
  nominations, votes, and discards sit in the **1.5–5 s** range, with
  jitter, so it feels like people thinking. See [Timing](#timing).
- **Skip is quiet.** A small cream control, not a confession that the
  table is fake. Leaving goes Home. Progress stays.
- **Copy is میز.** Spoken Iranian Persian, «شما». Night whispers stay
  close (`نقشت رو`). English is a second original. Daniel follows
  [`ravi-script.md`](./ravi-script.md).

---

## Step 0 — what the pieces are

Full-screen pages before the table. One subject per page: real game art
plus a short name (not how to play). Continue / Previous / Skip.

The election tracker starts with an empty what/why page, then three pages
(first fail → second → chaos). Those three **add** the next mark — they do
not refill from empty.

Last page asks «گرفتید؟». Yes → «بریم سر میز». No → «مشکلی نیست» then
still open the look table. Either answer goes to step 1.

Slides live in `client/src/tutorial/introSlides.ts`. Copy under
`onboard.piece.*` in both locales.

---

## Step 1 — how to play

Not a slideshow of posters. A **staged 5-seat table** (the real
Game-screen chrome). Step 0 already named the pieces. Here they see the
room, then how people talk their way into office.

Nima is President from the first beat. The player is not. After the
boards, Daniel points at Nima, then chat opens and grows up. He
explains why people talk, then they listen together, then the table
campaigns. The first ghost is a bad line — copying it is still
rejected. The second ghost is the real pitch. After a match, Nima names
them Chancellor, the ticket modal, then a blur and “see next”.

Beats live in `client/src/tutorial/lookView.ts` (`LOOK_BEATS`). Copy
under `onboard.idea.*` and `onboard.talk.*` in both locales.

### Ring — sometimes there is no select

The gold ring is a **pointer**, not a default. If the beat is “look at
the whole table”, lift the mask. No hole, no gold border, no office
ribbons that make a seat look picked.

| Ring | What they see |
|---|---|
| **Off** | Whole table. Warm room, no smoke hole. Nima already wears the President ribbon — no gold ring, so it is not a pick (welcome). After the ticket, the closing beat is off again — you already sit as Chancellor, no ring. |
| **On** | One punched-out thing, gold border, smoke over the rest. That widget is the lesson. Chat / composer rings sit **inside** the panel: inset from the screen edge, below Continue. |
| **On, then chat** | After boards, ring **only** Nima. Then open chat. Do not ring the whole table while they talk. After a matching pitch, Nima speaks in chat; then ring **only** the ticket modal. |

Never ring the seats on the first beat. Never leave a seat looking
selected when Daniel is talking about the whole page. Chat is hidden
until after the President beat; it **grows up** from composer height
when it first opens. The composer ring is only for the write beat
(clicks must pass through so they can type). Ghost hint stays dim even
while they type. Continue on the talk beats sits a little onto the chat
handle — it must not sit on the gold border.

Continue, Previous, and Skip are hidden while Daniel's header is still
typing. Continue also stays off while the campaign plays, while they
write, and while Nima names them in chat. The last Continue is «ببینیم»
/ “Let's see”, not «ادامه».

The write beat is two tries. First ghost is a **bad** line — even copying
it is rejected («این جمله کمکتون نمی‌کنه.»). Then another campaign and
the real suggestion. Match that, Nima names them in chat, ticket modal,
then a blur and «می‌خواید ببینید بعدش چی می‌شه؟».

### Beats

| # | Ring | Chat | Wait | They learn | Daniel FA | Daniel EN | Tone |
|---|---|---|---|---|---|---|---|
| 1 | **Off** — whole table, Nima already President | Hidden | Continue | We're in | وارد بازی شدیم. درسته، همه‌چی که تا الان دیدیم اینجا استفاده می‌شه. | We're in. Right — everything you just saw is used on this screen. | `[warmly]` |
| 2 | **On** — all seats | Hidden | Continue | Who sits | اینا آدمای بازی‌ان. دو دسته تو بازی هست: فاشیست و لیبرال. | These are the people in the game. Two sides: Fascist and Liberal. | `[calm]` |
| 3 | **On** — boards | Hidden | Continue | Where laws sit | اینا هم تخته‌های بازی‌ان. قانون‌ها روشون می‌شینه. | And these are the boards. That is where the laws sit. | `[calm]` |
| 4 | **On** — Nima | Hidden | Continue | Who is President | این یکی رئیس‌جمهوره. هر دست صدراعظم رو این انتخاب می‌کنه. | This one is President. They pick the Chancellor each hand. | `[calm]` |
| 5 | **On** — chat (inset) | Opens, grows up | Continue | How people talk | آدما با هم حرف می‌زنن — هم با پیام، هم با میکروفون. | People talk to each other — in chat, and on the mic. | `[calm]` |
| 6 | **On** — chat (inset) | Open | Continue | Why they talk | همه سعی می‌کنن لیبرال به نظر برسن تا رئیس‌جمهور بذارتشون صدراعظم. | Everyone tries to look Liberal so the President will make them Chancellor. | `[announce]` |
| 7 | **On** — chat (inset) | Open | Continue | Let's listen | با هم ببینیم سر میز چی می‌گن. | Let's watch together what they're saying. | `[calm]` |
| 8 | **On** — chat (inset) | Open, auto lines + seat clouds | Until talk ends | Campaign as Liberal | (same as #7) | (same as #7) | `[announce]` |
| 9 | **On** — composer only (tappable) | Open | Until they send | Write — first line is bad | شما هم بنویسید. یه چیزی که رئیس‌جمهور بذارتتون صدراعظم. | Your turn. Write something that makes the President name you Chancellor. | `[calm]` |
| 10 | **On** — ticket modal only | Open | Continue | You are Chancellor | این یعنی شما صدراعظم این دستید. | That makes you Chancellor this hand. | `[announce]` |
| 11 | **Blur** — whole table | Hidden | «ببینیم» | Next hand | می‌خواید ببینید بعدش چی می‌شه؟ | Want to see what happens next? | `[warmly]` |

Then the five-player hand starts. No “this is a lesson table” in these lines.

### Campaign talk (beat 8)

Table colour. Two lines each from رضا، سارا، امید، and نیما (President).
Each line also paints the seat cloud. 2.8–4.2 s between messages.
Reza claims Liberal first; Sara calls it. Native fa / native en — not a
translation of each other. They never mention Daniel, the guide, or that
the table is scripted.

| Who | FA | EN |
|---|---|---|
| رضا | من لیبرالم، به من اعتماد کن. | I'm Liberal. Trust me. |
| سارا | نه بابا، داره فریبتون می‌ده. | Come off it. He's playing you. |
| امید | از کجا معلوم؟ هر کی می‌تونه اینو بگه. | How would we know? Anyone can say that. |
| نیما | آروم باشید. دارم گوش می‌دم. | Easy. I'm listening. |
| رضا | جدی می‌گم. بذارید برم صدراعظم، خودتون می‌بینید. | I'm serious. Put me in — you'll see. |
| سارا | رئیس‌جمهور این یکی رو نذار. خیلی عجله داره. | Don't pick him. He's rushing it. |
| امید | منم لیبرالم. فقط سر میز داد نمی‌زنم. | I'm Liberal too. I just don't shout it. |
| نیما | باشه. یکی رو برمی‌دارم. | Alright. I'll pick someone. |

Ghost 1 (bad, even a copy is rejected): «منو بذارید. برام فرقی نداره کی می‌بره.» / “Just put me in. I don't care who wins.”
Ghost 2: «رئیس‌جمهور منو بذارید. لیبرالم.» / “Put me in. I'm Liberal.”

Nima on a bad first line: «این جمله به درد نمی‌خوره.» / “That line won't get you in.”
Nima on a match, before the modal: «{name} رو می‌ذارم صدراعظم.» / “I'm putting {name} in as Chancellor.”

Second campaign (after the first miss):

| Who | FA | EN |
|---|---|---|
| رضا | باز هم می‌گم، لیبرالم. | I'll say it again. I'm Liberal. |
| سارا | یکی دیگه رو بذار. | Pick someone else. |
| امید | فرقی نمی‌کنه، همه همینو می‌گن. | Doesn't matter. Everyone says that. |
| نیما | هنوز گوش می‌دم. | Still listening. |
| رضا | این دست منو بذارید. | This hand, put me in. |
| سارا | رئیس‌جمهور عجله نکن. | Don't rush it. |

---

## Mask

Not a black dimmer and not a tutorial cartoon.

- Fill: warm smoke, roughly `rgba(12, 8, 5, 0.55)` — dark enough to
  kill contrast on the rest, still the same room.
- Hole: one bounding rect for all matches (~8 px pad, 12 px radius),
  optional gold ring. President + chancellor share a single hole.
- The punched-out control is the only pressable hit target.
- Ravi / Daniel plaque sits **above** the mask (never covered).
- Continue / Skip / Previous sit in the safe area, also above the mask,
  and stay off while the header line is still typing. On chat beats they
  overlap the chat handle a little so they are not sitting on the gold
  ring. Previous is hidden on the first beat.
- Reduce-motion: no pulse; hole still moves.

Same overlay for step 1 and for teaching beats inside a match. When
the table is just playing (a bot nominates, votes flip), **lift the
mask**. Step 1 also lifts on purpose: welcome and the closing “see next”.

---

## Timing

Floor for anything the player can see. Jitter so two bots never move
on the same frame.

| Event | Delay |
|---|---|
| Next player sits in lobby | 1.8–4.5 s after the previous |
| First lobby chat after sitting | 2–5 s |
| Chat after a public event (law, failed vote) | 1.8–3.8 s |
| Look-table campaign line | 2.8–4.2 s between seats; first line 2–2.8 s |
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
| 0 | (player) | (player) | Liberal | Only human. Step 1: not President — Nima is, from beat 1. Step 2: first President. |
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

### Step 1 campaign (look table)

Eight lines, two each. Keys `onboard.talk.trustMe` … `illPick`. A miss
adds `LOOK_CAMPAIGN_AGAIN`. Each line is also a seat cloud. Timing as
in [Timing](#timing) — not a burst.

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

Implemented: after the five-player win, Continue sits the next count.
Each of 6–10 opens on a **delta** Continue (`onboard.nextSix` … `nextTen`)
then one unique lock (six: term-limit nominate; seven: investigate then
special election; nine: two investigates; eight/ten: the line is the
lesson). Then the table auto-plays to a Liberal win. Player stays Liberal.

---

## Daniel — new clips

Live-table lines (`deal.start`, `vote.passed`, …) stay. Guide lines are
`onboard.*` so a real server game never speaks them.

Audio: Daniel, FA takes. EN is subtitle until we record it.

Do not use the word تمرین / practice / bot / ربات in any of these.

| Id | Tone | FA | EN |
|---|---|---|---|
| `onboard.sit` | warmly | بشینید. از روی میز نشون می‌دم. | Sit. I'll show you from the table. |
| `onboard.idea.welcome` | warmly | *(step 1 #1 — no ring)* | |
| `onboard.idea.people` | calm | *(step 1 #2 — ring seats)* | |
| `onboard.idea.boards` | calm | *(step 1 #3 — ring boards)* | |
| `onboard.idea.thisPresident` | calm | *(step 1 #4 — ring Nima)* | |
| `onboard.idea.talk` | calm | *(step 1 #5 — ring chat)* | |
| `onboard.idea.campaign` | announcing | *(step 1 #6)* | |
| `onboard.idea.talkAbout` | calm | *(step 1 #7 — then talk starts)* | |
| `onboard.idea.yourTurn` | calm | *(step 1 #9 — ring composer)* | |
| `onboard.idea.badPitch` | down | *(first send, even if they copied the ghost)* | |
| `onboard.idea.writeTheHint` | down | *(second miss)* | |
| `onboard.idea.youChancellor` | announcing | *(step 1 #10 — ring ticket)* | |
| `onboard.idea.seeNext` | warmly | *(step 1 #11 — blur)* | |
| `onboard.letsSit` | warmly | بریم سر میز. | Let's sit. |
| `onboard.night.done` | whispering | شما لیبرالید. بقیه رو نمی‌بینید. همین درسته. | You are a Liberal. You do not see the others. That is the point. |
| `onboard.pick` | calm | یه صدراعظم انتخاب کنید. نیما آرومه. از اونجا شروع کنید. | Pick a Chancellor. Nima is calm. Start there. |
| `onboard.pick.retry` | down | این یکی رو برای این دست نه. یکی دیگه. | Not that one for this hand. Someone else. |
| `onboard.vote` | calm | کارت رأی‌تون رو بزنید. این دولت رو می‌خواید — آره. | Tap your vote. You want this government — Ja. |
| `onboard.votes.read` | firm | رضا نه گفت. یکی که هی نه می‌ده، یادتون بمونه. | Reza said Nein. Remember who keeps saying no. |
| `onboard.draw` | whispering | سه تا قانون اومد دستتون. فاشیسته رو بسوزونید. دوتای لیبرال می‌ره برای نیما. | Three laws in your hand. Burn the Fascist. The two Liberals go to Nima. |
| `onboard.watch` | calm | این دست شما نیستید. ببینید کی با کی می‌شینه. | This hand is not yours. Watch who sits with whom. |
| `onboard.refuse` | firm | رضا امید رو گذاشت. خیلی زود با هم کنار اومدن. نه بدید. | Reza named Omid. They lined up too fast. Vote Nein. |
| `onboard.tracker` | down | *(five-table fail — same idea as look fail beats)* | |
| `onboard.chancellor` | whispering | حالا صدراعظمید. از این دوتا یکی رو می‌ذارید رو تخته. لیبرال رو بذارید. | You are Chancellor now. You enact one of these two. Put the Liberal down. |
| `onboard.peek` | whispering | سه تای بالای دسته رو ببینید. سر جاشون برگردونید. به میز دروغ بگید اگه لازم شد. | Look at the top three. Put them back. Lie to the table if you have to. |
| `onboard.execute` | grave | یه نفر رو از میز بردارید. اگه هیتلر باشه، لیبرال‌ها می‌برن. نقشش رو کسی نمی‌بینه مگر اینکه هیتلر باشه. | Take someone off the table. If it is Hitler, the Liberals win. Nobody sees the role unless it is Hitler. |
| `onboard.win` | warmly | لیبرال‌ها بردن. دست بعد کسی بهتون نمی‌گه کی دروغ می‌گه. گوش کنید کی حرف می‌زنه. | The Liberals win. Next hand nobody tells you who is lying. Listen to who talks. |
| `onboard.winNext` | warmly | لیبرال‌ها بردن. میز بعدی فقط همون چیزی رو نشون می‌ده که عوض شده. | The Liberals win. The next table only shows what changed. |
| `onboard.nextSix` | calmly | یه لیبرال اضافه اومد سر میز. تخته همون تختهٔ پنج‌نفره‌ست. تا شش نفر زنده‌ان، رئیس‌جمهور قبلی و صدراعظم قبلی قفلن. یکی بمیره و پنج نفر بمونن، فقط صدراعظم قبلی قفل می‌مونه. | One more Liberal sits down. Same small board as five. While six remain, last president and last chancellor are locked. If someone dies and five are left, only last chancellor stays locked. |
| `onboard.termLimit` | calmly | نیما همین الان صدراعظم بود. دوباره نمی‌شه انتخابش کرد. تا شش نفر سر میزن، رئیس‌جمهور قبلی هم قفله. | Nima just sat as Chancellor. You cannot name them again. While six are alive, last president is locked too. |
| `onboard.nextSeven` | calmly | از هفت نفر به بعد هیتلر شب فاشیست‌ها رو نمی‌بینه. تخته عوض می‌شه: اول تحقیق، بعد انتخابات ویژه. | From seven on, Hitler does not see the Fascists at night. The board changes: first investigate, then a special election. |
| `onboard.investigate` | whispering | یه صندلی رو بزنید. فقط حزبش رو می‌بینید، نقشش رو نه. به میز دروغ بگید اگه لازم شد. | Tap a seat. You see their party, not their role. Lie to the table if you have to. |
| `onboard.specialElection` | calmly | رئیس‌جمهور بعدی رو شما انتخاب می‌کنید — نوبت دور میز نیست. | You pick the next President — it does not walk around the table. |
| `onboard.nextEight` | calmly | تخته همون تختهٔ هفت‌نفره‌ست. دو فاشیست دور یه هیتلر که شب چیزی ندید. میز شلوغ‌تره، رأی سخت‌تر. | Same board as seven. Two Fascists around a Hitler who saw nothing at night. More seats, noisier votes. |
| `onboard.nextNine` | calmly | دو بار تحقیق می‌آد. سه فاشیست به‌علاوهٔ هیتلر. | Investigate twice. Three Fascists plus Hitler. |
| `onboard.nextTen` | calmly | میز کامل. قدرتا همون‌هاست — صندلی بیشتر، حرف بیشتر. | Full table. Same powers — more seats, more talk. |

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
- Continue: brass chip. Previous / Skip: quiet cream, not a second primary.
- **No Practice pill.** No robot badge on seats.
- Phone 430 px. Overlay must not cover the punched-out control.
- Press, not hover.

---

## Assets

| Need | New? | Notes |
|---|---|---|
| Seats, boards, cards, votes, deck | No | Real table. Step 1 *is* those widgets. |
| Lesson music + stings | **Yes** | Suno. Prompts in [`background-music.md`](./background-music.md). When they play: [`onboarding-audio.md`](./onboarding-audio.md). |
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
  introSlides.ts         step 0
  lookView.ts            step 1 beats (ring vs lifted; campaign talk)
  scriptedTable.ts       5–10 in-memory tables
  cast.ts                companion names

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
- `FEATURE_ONBOARDING` / `flags.onboarding` ships dark, then on. First-run
  SitOffer after splash offers step 0 instead of only the video hub.
  Local `pnpm dev` skips that offer; a home icon opens the same table.

This is the one place the client mutates a `Room`. It is a closed box.
A tutorial table is never published, never in match history, never a
friend-request source.

Tests live next to the director and scripts (`it('Should …')`). Engine
rules stay covered by existing shared tests; tutorial tests lock the
script (Nima/Sara for the first chancellor, Reza ticket fails, peek
happens, …).

---

## Out of the first ship

- Playing as Fascist / Hitler.
- Voice chat / Daniel `onboard.*` mp3s.
- LLM seats.
- Mid-step crash resume (seven minutes; start the step over).

---

## Build order

### Step 0 — intro pages

- [x] `INTRO_SLIDES` + `OnboardingIntroScreen` (one idea per page).
- [x] Sit / Dev home icon → `onboarding` screen → last Continue opens look.
- [x] Titles + bodies in fa/en; Skip / Previous / progress.

### Step 1 + plumbing

- [x] `TutorialService` holds an in-memory snapshot; `lookView()` matches
      what GameScreen already reads.
- [x] Spotlight / mask; punch-out from the current beat.
- [x] Step 1 beat list + Daniel lines in i18n (header text; no clips yet).
- [x] First-run: Sit / Not now. Skip. `sh:onboarding-step`.
- [x] Tests: punch-outs in order; Skip leaves.
- [x] Staged UI per beat: whole table (no ring) → seats → boards → chat
      → campaign → player writes → Nima picks → ticket → see next.

### Step 2

- [x] `scriptedTable.ts` + `StackedDeck`: roles, stack; five keeps night.
- [x] Director: nominate → vote → burn → refuse → enact → auto toward win.
- [x] Teaching locks; off-script taps ignored + retry line.
- [x] Peek + execute happen once; Liberal win (director prefers Fascist
      laws until those powers fire).
- [x] No “bot/practice” copy anywhere in fa/en.
- [x] Tests for five table cast and first chancellor lock.

### Voice

- [ ] Record Daniel `onboard.*` FA.
- [ ] Subtitles work with voice off.

### Later counts

- [x] Six–ten as delta sittings on `scriptedTable` (not a second lecture).
- [x] After a win, Continue sits the next count; ten returns Home.
- [ ] Guide hub: continue from last unfinished step.

### Ship

- [ ] `FEATURE_ONBOARDING` off, then playtest on 430 px in Bale.
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
