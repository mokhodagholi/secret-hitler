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
- **Skip is quiet.** A small cream control. It skips this **step** and
  opens the next one — intro → look, look → five. Skip on five opens
  the coming-soon blur. Hardware back still goes Home. Progress stays.
  Previous still walks look beats backward.
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

## Home settings

The table gear is a mute sheet. The **home** gear is name, portrait, and
sound. First time they stand on Home with no Sit dialog, Daniel rings
that icon. They tap it, the Settings page opens, and he walks **each
row** — what it is, what it does. Skip anytime. Remembered in
`sh:onboarding-home-settings`. Unlike Sit, local `pnpm dev` still shows
this when `FEATURE_ONBOARDING` is on. A palette icon next to the hand
replays the same lesson.

Beats live in `client/src/tutorial/settingsView.ts` (`SETTINGS_BEATS`).
Copy under `onboard.idea.homeSettings` and `onboard.settings.*`.

| # | Ring | Wait | They learn |
|---|---|---|---|
| 1 | Home gear | Until they tap | Settings live behind this button |
| 2 | Name | Continue | The name the table sees |
| 3 | Player card | Continue | The picture on their seat |
| 4 | Music | Continue | Desk / menu music |
| 5 | Sound | Continue | Votes, cards, table sounds |
| 6 | Ravi | Continue | Daniel's voice; can read instead |
| 7 | Table voice | Continue | Mic talk — only if `flags.voice` |
| 8 | Narrator | Continue | Who is talking to them |
| 9 | Reduce motion | Continue | Less movement on screen |
| 10 | Briefing | Continue | What we added |
| 11 | Support | Continue | Write if something is wrong |
| 12 | Lifted | Continue | Open Settings from Home any time |

---

## Home history

Past tables live under the History chip. First time they finish the home
gear (tap or Skip), Daniel rings that chip, they open it, and a **mock**
list walks every chip on the sheet. Cards start **collapsed** (same as the
live History sheet). No `/api/history` — the tour never writes a real
match. Remembered in `sh:onboarding-home-history`. Local `pnpm dev` skips
the first-run prompt; a trophy icon next to the hand opens the same tour.

Beats live in `client/src/tutorial/historyView.ts` (`HISTORY_BEATS`).
Copy under `onboard.history.*` in both locales.

| # | Ring | Wait | They learn |
|---|---|---|---|
| 1 | History chip | Until they tap | Every match they've played — details are here |
| 2 | Sheet | Continue | Finished tables; empty until they play |
| 3 | Winner line | Continue | Liberals or Fascists took it |
| 4 | You won / lost + date | Continue | Their result, and when (hour and minute) |
| 5 | Seats | Continue | Everyone, seat order — first card expands |
| 6 | Your row | Continue | Your role (first match only) |
| 7 | Roles | Continue | After a match the roles are public |
| 8 | Add on Reza | Until they tap Add | Add from here like after a match |
| 9 | Sent / friends / incoming | Continue | The three other friend chips |
| 10 | Lost table | Continue | Imagine another game they lost — second card drops in |
| 11 | Lifted | Continue | Open History from Home any time |

One mock win first (Nima–Omid). After friends, a Fascist loss (Maryam–Behrad)
lands under it and the sheet scrolls to it. Reza starts with Add; Nima is
already friends; Sara already sent; Omid has an incoming request. No guest
seats.

---

---

## Step 1 — how to play

Not a slideshow of posters. A **staged 5-seat table** (the real
Game-screen chrome). Step 0 already named the pieces. Here they see the
room, then how people talk their way into office.

Nima is President from the first beat. The player is not. After the
boards, Daniel points at Nima — what the President does (names a
Chancellor; if that government sits, draws three, burns one, passes
two). Then chat opens and grows up. He explains why people talk, then
they listen together, then the table campaigns. The ghost is a
suggestion — any line they send is enough. After they write, Nima puts
their name up, the ticket (you are Chancellor, then what that seat
does), then the three-card hand: only the President sees the draw,
burns one, two come to you, you put one down. Then a blur and “see
next”.

Beats live in `client/src/tutorial/lookView.ts` (`LOOK_BEATS`). Copy
under `onboard.idea.*` and `onboard.talk.*` in both locales.

### Ring — sometimes there is no select

The gold ring is a **pointer**, not a default. If the beat is “look at
the whole table”, lift the mask. No hole, no gold border, no office
ribbons that make a seat look picked.

| Ring | What they see |
|---|---|
| **Off** | Whole table. Warm room, no smoke hole. Nima already wears the President ribbon — no gold ring, so it is not a pick (welcome). After the law hand, the closing beat is off again — you already sit as Chancellor, no ring. |
| **On** | One punched-out thing, gold border, smoke over the rest. That widget is the lesson. Chat rings sit **inside** the panel: inset from the screen edge. Composer rings sit on the bottom chat strip (the top line, the field, and send) — no extra pad. Continue sits **under** the chat with a gap — not on the gold border. |
| **On, then chat** | After boards, ring **only** Nima (who they are, then what they do with three laws). Then open chat. Do not ring the whole table while they talk. After they send a pitch, Nima speaks in chat; then ring **only** the ticket modal; then the law dialog. |

Never ring the seats on the first beat. Never leave a seat looking
selected when Daniel is talking about the whole page. Chat is hidden
until after the President beats; it **grows up** from composer height
when it first opens. First the whole dock (chat + mic, **one** ring
around the panel — no extra gold on the mic), then the gear (they tap
it), then the settings sheet, then the feed, then the composer. After
they send, lift the mask. “Where were we?” then the
campaign line, still with no ring. “Let’s listen” stays lifted, then
after two seconds the mask rings **chat** (the panel, not each bubble —
still no extra mic border) while the table talks. The composer
ring is only for a write beat (clicks must pass through so they can
type). Ghost hint stays dim even while they type. Continue sits under
the chat with a gap so it is not sitting on the gold border.

Continue, Previous, and Skip are hidden while Daniel's header is still
typing. Continue also stays off while they open settings, while they
write a first line, while
“where were we?” is on, while “let’s listen” waits two seconds, while
the campaign plays, while they pitch, while Nima names them in chat,
and while they pick a law. The last Continue is «ببینیم» / “Let's
see”, not «ادامه».

The first write is any line — Daniel waits, then lifts the mask and
picks the lesson back up. The chancellor pitch is any line too; the
ghost is a suggestion, not a required copy. After they send, the mask
lifts, Nima names them in chat, ticket (you are Chancellor, then what
the Chancellor does), three cards to the President, burn, two to you,
you put one down, then a blur and
«بریم ببینیم تو یه بازی ۵ نفره چه اتفاقاتی می‌افته.».

### Beats

| # | Ring | Chat | Wait | They learn | Daniel FA | Daniel EN | Tone |
|---|---|---|---|---|---|---|---|
| 1 | **Off** — whole table, Nima already President | Hidden | Continue | We're in | وارد بازی شدیم. درسته، همه‌چی که تا الان دیدیم اینجا استفاده می‌شه. | We're in. Right — everything you just saw is used on this screen. | `[warmly]` |
| 2 | **On** — all seats | Hidden | Continue | Who sits | اینا آدمای بازی‌ان. دو دسته تو بازی هست: فاشیست و لیبرال. | These are the people in the game. Two sides: Fascist and Liberal. | `[calm]` |
| 3 | **On** — boards | Hidden | Continue | Where laws sit | اینا هم تخته‌های بازی‌ان. قانون‌ها روشون می‌شینه. | And these are the boards. That is where the laws sit. | `[calm]` |
| 4 | **On** — Nima | Hidden | Continue | Who is President | این یکی رئیس‌جمهوره. هر دست صدراعظم رو همین انتخاب می‌کنه. | This one is President. Each hand they pick the Chancellor. | `[calm]` |
| 5 | **On** — Nima | Hidden | Continue | President laws | اگه دولت رأی بیاره، سه تا قانون از دسته می‌کشه. یکی رو می‌سوزونه، دوتا رو می‌ده به صدراعظم. | If that government sits, they draw three laws from the deck. They burn one and pass the other two to the Chancellor. | `[calm]` |
| 6 | **On** — chat (inset; mic inside, no extra ring) | Opens, grows up | Continue | How people talk | آدما با هم حرف می‌زنن — هم با پیام، هم با میکروفون. | People talk to each other — in chat, and on the mic. | `[calm]` |
| 7 | **On** — gear | Open | Until they tap the gear | Settings live here | صدا، نقش‌تون، قوانین — همه‌ش پشت این دکمه‌ست. بزنید روش. | Sound, your role, the rules — they all sit behind this button. Tap it. | `[calm]` |
| 8 | **On** — settings sheet | Open | Continue | What the menu holds | از اینجا می‌تونید صدا رو قطع کنید، نقش‌تون رو ببینید، یا از میز برید بیرون. | From here you mute the room, look at your card, or leave the table. | `[calm]` |
| 9 | **On** — feed (inset) | Open | Continue | Where lines land | پیام‌ها همین‌جا می‌آد. | Messages show up here. | `[calm]` |
| 10 | **On** — composer only (tappable) | Open | Until they send any line | You can write | هر چی اینجا بنویسید می‌ره تو چت و بقیه می‌بینن. الان یه چیزی بنویسید، بعد دکمهٔ فرستادن رو بزنید. | Anything you type here goes into chat and the table sees it. Write something, then hit send. | `[calm]` |
| 11 | **Off** — whole table | Open, their line | Pause | Resume | خب کجا بودیم؟ | Wait — where were we? | `[calm]` |
| 12 | **Off** — whole table | Open | Continue | Why they talk | اها داشتم می‌گفتم درسته که رئیس‌جمهور صدراعظم رو انتخاب می‌کنه، ولی این همه هستن که رأی می‌دن کدوم دولت تشکیل شه. | Right — the President names a Chancellor, but everybody votes which government sits. | `[announce]` |
| 13 | **Off** — whole table | Open | Pause 2s | Let's listen | با هم ببینیم سر میز چی می‌گن. | Let's watch together what they're saying. | `[calm]` |
| 14 | **On** — chat panel (not messages) | Open, auto lines + seat clouds | Until talk ends | Campaign as Liberal | (same as #13) | (same as #13) | `[announce]` |
| 15 | **On** — composer only (tappable) | Open | Until they send any line | Write — suggestion is a ghost | شما هم حرف بزنید. یه چیزی که بقیه بهش رأی آره بدن. | Your turn. Write something the table would vote Ja on — not just the President. | `[calm]` |
| 16 | **On** — ticket modal only | Open | Continue | You are Chancellor | الان شما صدراعظم این دستید. | You are Chancellor this hand. | `[announce]` |
| 17 | **On** — ticket modal only | Open | Continue | What Chancellor does | صدراعظم دو تا قانون می‌گیره و یکی رو می‌ذاره رو تخته — لیبرال یا فاشیست. | The Chancellor gets two laws and puts one on the board — Liberal or Fascist. | `[calm]` |
| 18 | **On** — law dialog | Open | Continue | Only President sees | این سه تا فقط دست رئیس‌جمهوره. شما نمی‌بینید چی اومده. | Those three are only in the President's hand. You do not see what came. | `[calm]` |
| 19 | **On** — law dialog | Open | Continue | Burn and pass | یکی رو سوزوند. دوتا می‌آد دست شما. | They burned one. Two are coming to you. | `[calm]` |
| 20 | **On** — law dialog (tappable) | Open | Until they tap a law | You enact | الان نوبت شماست. یکی رو بذارید رو تخته. | Your turn. Put one on the board. | `[calm]` |
| 21 | **Blur** — whole table | Hidden | «ببینیم» | Next hand | بریم ببینیم تو یه بازی ۵ نفره چه اتفاقاتی می‌افته. | Let's see what happens at a five-player table. | `[warmly]` |

Then the five-player hand starts. No “this is a lesson table” in these lines.

### Campaign talk (beat 14)

Table colour. Nima asks who to name; Reza jumps too early; Sara talks
like a voter; Omid stays quiet. Each line also paints the seat cloud.
4.5–6.5 s between messages. Native fa / native en — not a translation
of each other. They never mention Daniel, the guide, or that the table
is scripted. The President **asks** — the vote is the table’s.

| Who | FA | EN |
|---|---|---|
| نیما | کی رو بذارم صدراعظم؟ نظر بدید. | Who should I name Chancellor? Tell me. |
| رضا | بچه‌ها من لیبرالم ها. همین اول منو بذارید صدراعظم. | I'm Liberal, come on. Put me in first. |
| سارا | رضا چرا انقدر سریع گفتی؟ | Reza, why'd you jump in so fast? |
| امید | بذار میز حرف بزنه. رأی با همه‌ست. | Let the table talk. We all vote. |
| رضا | جدی می‌گم. بذارید برم، خودتون می‌بینید چی می‌ذارم. | I'm serious. Put me in — you'll see what I enact. |
| سارا | اگه رضا باشه من نه می‌دم. خیلی عجله داره. | If it's Reza I'm voting Nein. He's rushing it. |
| امید | ببینید منم می‌تونم الکی اینجا شلوغ کنم ولی می‌خوام حرف بزنیم دلیل بیاریم… | Look, I could just make noise here too — I'd rather we talk and give reasons… |
| نیما | باشه یکی رو می‌ذارم. | Alright. Naming one. |

Ghost (suggestion only — any send is accepted): «هرکی باشه فرقی نداره» / “Anyone's fine first.”

Nima on a send, before the modal: «{name} رو می‌ذارم. رأی بدید.» / “{name} — I'm putting them up. We vote.”

---

## Mask

Not a black dimmer and not a tutorial cartoon.

- Fill: warm smoke, roughly `rgba(12, 8, 5, 0.8)` — dark enough to
  kill contrast on the rest, still the same room.
- Hole: one bounding rect for all matches (~8 px pad, 12 px radius),
  optional gold ring. Composer sits on the bottom chat strip (top
  line, field, send) — no extra pad. President + chancellor share a
  single hole.
- The punched-out control is the only pressable hit target.
- Ravi / Daniel plaque sits **above** the mask (never covered).
- Continue / Skip / Previous sit in the safe area, also above the mask,
  and stay off while the header line is still typing. On chat beats they
  sit **under** the panel with a gap so they are not sitting on the gold
  ring. Previous is hidden on the first beat.
- Reduce-motion: no pulse; hole still moves. The gold ring also stays
  still whenever Continue / Skip are off (header still typing, or the
  player must tap a control).

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
| Look-table campaign line | 4.5–6.5 s between seats; first line 3.5–5 s |
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

Reuse existing avatars, **gender-matched** to the seat names. Later steps add seats from a
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

Eight lines. Nima asks first (`onboard.talk.listening`). Keys through
`illPick`. Each line is also a seat cloud. Timing as in [Timing](#timing)
— not a burst.

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

## Step 2 — five players, first government

Easy on the player (always Liberal, first President). The live Ravi
opening plays first (`deal.start`, night, `president.firstYou`,
`discuss.start`). Then the table talks. This ship walks **one**
government — nominate, vote, three cards, secret chancellor pick —
then a blur: the rest of the table is coming soon.

Force roles: 3 Liberal, 1 Fascist, Hitler. Night is 5–6: Fascist and
Hitler see each other. The player only sees their own card.

Stacked deck so the scripted laws land. Timers paused during a teaching
lock; otherwise they run, generous. Table talk sits in the **4.5–6.5 s**
range.

### Teaching beats (mask on)

Player-touch is **bold**. Night and bot votes lift the mask. The live
header stays up until a teaching lock.

1. Night — the real overlay: `deal.start`, `night.start`, look, hide,
   `president.firstYou`, `discuss.start`. No `onboard.nightDone` line.
   Then `onboard.youPresident` stays on the header for **3 s** before
   the table talks. Teaching lines also wait **3 s** after the previous
   line finishes typing.
2. Table talk (mask off). Then **tap Choose Chancellor** in the chat
   header. Daniel, in order: `onboard.mustNominate`,
   `onboard.openNominate`, `onboard.openNominateTap`.
3. After the tap: `onboard.pick`, then **name Nima**
   (`onboard.pickNima`). Other seats: retry, command ignored.
4. **Vote Ja.** `onboard.vote` — this ticket is you + Nima; it needs a
   majority. Nein is ignored (`onboard.voteRetry`) until they tap Ja.
   Others vote staggered: Nima and Sara Ja, Reza and Omid Nein. Two
   no, three yes — the government sits.
5. Pause so the ballots stay on the seats, then **three cards**.
   `onboard.draw` — burn one; the other two go to the Chancellor.
6. Nima enacts in secret. `onboard.secretEnact` — nobody else sees
   those laws or which one they pick. Then a blur:
   `onboard.comingSoon`.

Wrong tap: Daniel repeats, state does not advance.

Peek, execute, term limits, and the later governments are the next
slice of this step — not in this ship.

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
| `onboard.idea.homeSettings` | calm | *(home gear — wait for tap)* | |
| `onboard.settings.name` | calm | *(name field)* | |
| `onboard.settings.card` | calm | *(player card)* | |
| `onboard.settings.music` | calm | *(music)* | |
| `onboard.settings.sound` | calm | *(sound effects)* | |
| `onboard.settings.ravi` | calm | *(ravi voice)* | |
| `onboard.settings.table` | calm | *(table voice — if flag)* | |
| `onboard.settings.who` | calm | *(narrator)* | |
| `onboard.settings.motion` | calm | *(reduce motion)* | |
| `onboard.settings.briefing` | calm | *(changelog)* | |
| `onboard.settings.support` | calm | *(support)* | |
| `onboard.settings.done` | warmly | *(lifted)* | |
| `onboard.history.chip` | calm | *(home history chip — wait for tap)* | |
| `onboard.history.list` | calm | *(sheet)* | |
| `onboard.history.outcome` | calm | *(winner line)* | |
| `onboard.history.yours` | calm | *(you won / lost)* | |
| `onboard.history.people` | calm | *(seats)* | |
| `onboard.history.you` | calm | *(your row)* | |
| `onboard.history.roles` | calm | *(role chips)* | |
| `onboard.history.add` | calm | *(Add — wait for tap)* | |
| `onboard.history.ties` | calm | *(sent / friends / incoming)* | |
| `onboard.history.loss` | calm | *(second card — a loss)* | |
| `onboard.history.done` | warmly | *(lifted)* | |
| `onboard.idea.talk` | calm | *(step 1 #6 — ring chat, no extra mic ring)* | |
| `onboard.idea.settings` | calm | *(step 1 #7 — ring gear; wait for tap)* | |
| `onboard.idea.settingsMenu` | calm | *(step 1 #8 — ring the settings sheet)* | |
| `onboard.idea.messages` | calm | *(step 1 #9 — ring feed)* | |
| `onboard.idea.writeHere` | calm | *(step 1 #10 — ring composer, wait for any line)* | |
| `onboard.idea.whereWereWe` | calm | *(step 1 #11 — lift, then pause)* | |
| `onboard.idea.campaign` | announcing | *(step 1 #12 — still lifted)* | |
| `onboard.idea.talkAbout` | calm | *(step 1 #13 — lift; 2s then rings chat)* | |
| `onboard.idea.yourTurn` | calm | *(step 1 #15 — ring composer; any send; then lift)* | |
| `onboard.idea.youChancellor` | announcing | *(step 1 #16 — ring ticket)* | |
| `onboard.idea.seeNext` | warmly | *(step 1 #21 — blur)* | |
| `onboard.letsSit` | warmly | بریم سر میز. | Let's sit. |
| `onboard.youPresident` | calm | شما رئیس‌جمهورید. ببینید سر میز چی می‌شه. | You're President. Watch how the table plays this. |
| `onboard.mustNominate` | calm | باید یکی رو صدراعظم بذارید. اگه نذارید نوبتتون می‌سوزه و رئیس‌جمهور می‌ره نفر بعدی. | Name a Chancellor. If you don't, your turn burns and the next seat is President. |
| `onboard.openNominate` | calm | همین دکمه رو بزنید تا صدراعظم رو انتخاب کنید. | This button is how you pick them. |
| `onboard.openNominateTap` | calm | بزنید روش. | Tap it. |
| `onboard.pick` | calm | دست اول چیزی معلوم نیست. معمولاً نفر بعدی رو می‌ذارن تا بازی راه بیفته. | First hand nobody knows anything. Tables usually name the next seat so the game can start. |
| `onboard.pickNima` | calm | الان نیما رو بذارید صدراعظم. | Put Nima up as Chancellor. |
| `onboard.pick.retry` | down | این یکی رو برای این دست نه. یکی دیگه. | Not that one for this hand. Someone else. |
| `onboard.vote` | calm | دولت پیشنهاده — شما رئیس‌جمهورید، نیما صدراعظم. باید اکثریت آره بدن تا بشینن. الان آره بزنید. | That's a government: you President, Nima Chancellor. It sits if most people vote Ja. Tap Ja. |
| `onboard.voteRetry` | down | نه رو برای این دست نزنید. آره بزنید. | Not Nein this hand. Tap Ja. |
| `onboard.draw` | whispering | حالا یکی رو بسوزونید. دوتا می‌ره دست صدراعظم؛ یکی‌ش می‌شینه رو تخته. | Burn one. The other two go to the Chancellor — they put one on the board. |
| `onboard.secretEnact` | whispering | چی اومده و چی می‌ذاره رو فقط صدراعظم می‌بینه. | Only the Chancellor sees those laws, and which one they put down. |
| `onboard.comingSoon` | warmly | بقیه‌ش به‌زودی می‌آد سر میز. | The rest of this table is coming soon. |
| `onboard.watch` | calm | این دست شما نیستید. ببینید کی با کی می‌شینه. | This hand is not yours. Watch who sits with whom. |
| `onboard.refuse` | firm | رضا امید رو گذاشت. خیلی زود با هم کنار اومدن. نه بدید. | Reza named Omid. They lined up too fast. Vote Nein. |
| `onboard.tracker` | down | *(five-table fail — same idea as look fail beats)* | |
| `onboard.chancellor` | whispering | حالا صدراعظمید. از این دوتا یکی رو می‌ذارید رو تخته. لیبرال رو بذارید. | You are Chancellor now. You enact one of these two. Put the Liberal down. |
| `onboard.peek` | whispering | سه تای بالای دسته رو ببینید. سر جاشون برگردونید. به میز دروغ بگید اگه لازم شد. | Look at the top three. Put them back. Lie to the table if you have to. |
| `onboard.execute` | grave | یکی رو اعدام کنید. اگه هیتلر باشه، لیبرال‌ها می‌برن. اگه نباشه، نقشش مخفی می‌مونه. | Execute someone. If it is Hitler, the Liberals win. If not, the role stays hidden. |
| `onboard.win` | warmly | لیبرال‌ها بردن. دست بعد کسی بهتون نمی‌گه کی دروغ می‌گه. گوش کنید کی حرف می‌زنه. | The Liberals win. Next hand nobody tells you who is lying. Listen to who talks. |
| `onboard.winNext` | warmly | لیبرال‌ها بردن. میز بعدی فقط همون چیزی رو نشون می‌ده که عوض شده. | The Liberals win. The next table only shows what changed. |
| `onboard.nextSix` | calmly | یه لیبرال اضافه اومد سر میز. تخته همون تختهٔ پنج‌نفره‌ست. تا شش نفر زنده‌ان، رئیس‌جمهور قبلی و صدراعظم قبلی قفلن. یکی بمیره و پنج نفر بمونن، فقط صدراعظم قبلی قفل می‌مونه. | One more Liberal sits down. Same small board as five. While six remain, last president and last chancellor are locked. If someone dies and five are left, only last chancellor stays locked. |
| `onboard.termLimit` | calmly | نیما همین الان صدراعظم بود. دوباره نمی‌شه انتخابش کرد. تا شش نفر سر میزن، رئیس‌جمهور قبلی هم قفله. | Nima just sat as Chancellor. You cannot name them again. While six are alive, last president is locked too. |
| `onboard.nextSeven` | calmly | از هفت نفر به بعد هیتلر شب فاشیست‌ها رو نمی‌بینه. تخته عوض می‌شه: اول تحقیق، بعد انتخابات ویژه. | From seven on, Hitler does not see the Fascists at night. The board changes: first investigate, then a special election. |
| `onboard.investigate` | whispering | یه صندلی رو بزنید. فقط حزبش رو می‌بینید، نقشش رو نه. به میز دروغ بگید اگه لازم شد. | Tap a seat. You see their party, not their role. Lie to the table if you have to. |
| `onboard.specialElection` | calmly | رئیس‌جمهور بعدی رو شما انتخاب می‌کنید. خودتون رو نمی‌تونید انتخاب کنید. | You pick the next President — not yourself. It does not walk around the table. |
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
- Mask as above. Pulse on look punch-outs (`transform` / `opacity` only).
  During a play teaching lock the gold ring stays still.
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
  historyView.ts         home history beats + mock matches
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
- [x] Home gear: first visit rings settings (name / portrait / sound).
- [x] Home history: mock sheet after the gear; every chip on the list.
- [x] Tests: punch-outs in order; Skip opens five.
- [x] Staged UI per beat: whole table (no ring) → seats → boards →
      president (pick + laws) → chat → settings gear → settings sheet →
      campaign → player writes → Nima
      picks → ticket → three-card hand → see next.

### Step 2

- [x] `scriptedTable.ts` + `StackedDeck`: roles, stack; five keeps night.
- [x] Director: night (real Ravi) → talk → header nominate → Nima →
      vote (two Nein) → burn → secret enact → coming-soon blur.
- [x] Teaching locks; off-script taps ignored + retry line.
- [ ] Peek + execute + later governments (coming soon).
- [x] No “bot/practice” copy anywhere in fa/en.
- [x] Tests for five table cast, header-then-seat nominate, and first chancellor lock.

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
