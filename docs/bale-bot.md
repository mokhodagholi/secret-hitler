# Bale bot — commands

The Bale bot is a concierge: **private chat** for finding and joining tables,
and **one group command** (`/create`) that opens a table in that chat. It does
not play Secret Hitler and does not sit at a seat. Useful replies hand the
player a `ble.ir` mini-app link so the game itself opens inside Bale.

Telegram, the shared Mini App interface, and sitting Bale / Telegram /
browser players at the **same** table: [`mini-app.md`](./mini-app.md)
(proposal). This file stays the Bale command spec.

Replies are spoken Iranian Persian (register **بله** in
[`persian.md`](./persian.md) — address is «تو»). Copy lives in
[`server/src/bale/commands.ts`](../server/src/bale/commands.ts). Change the
strings there, not here.

## What a player actually gets

Every useful reply is some mix of:

1. **Text** — a short Persian message. Bale always parses it as Markdown, so
   command names with `_` are escaped (`/find\_game`). An unescaped underscore
   italicizes and **the send fails** — `/start` looks like a dead command.
   Hyphens (`/find-game`) still work if typed. Telegram replies use plain
   text (no `parse_mode`).
2. **A button** — almost always «بازی کن» or «ورود به اتاق», opening
   `https://ble.ir/{bot}?startapp=` or `…?startapp=CODE`. `/start` also
   has **کانال** → `ble.ir/secret_hitler_official`. The `url` is
   unescaped. Play, join, and channel links live **only** on this
   keyboard — Bale does not open markdown links in chat text, so the
   webhook never puts `[بازی کن](…)` in `text`. If Bale rejects the
   keyboard it retries the same text without buttons.

The bot never pastes the public website (`mrfantastic.ir`, localhost, …).
Production invites are Bale deep links. Localhost copies
`https://localhost:3000/join/CODE` from the waiting-room share button — that
path is the browser, not this chat bot.

## How a message becomes a reply

```
player types in a private chat, or `/create` in a group
        ↓
Bale POSTs an Update to /api/bale/webhook  (secret in the path or header)
        ↓
webhook.ts keeps private text, and `/create` in groups
        ↓
commands.ts  handleBotText  (private)  /  createGroupRoom  (group)
        ↓
bot.sendMessage(chat_id, text, reply_markup)
```

| Gate | What happens |
|---|---|
| No `BALE_BOT_TOKEN` | Webhook returns 503. There is no bot. |
| Secret mismatch | 401. Configure `BALE_WEBHOOK_SECRET`. |
| Channel | 200, no reply. |
| Group, anything except `/create` | 200, no reply. The group is not a help desk. |
| Group `/create` | Opens a locked table named after the sender. |
| Sticker, photo, empty text | 200, no reply. |
| Private text | Always a reply — known command, bare room code, or the start greeting. |

On boot the server calls `setMyCommands` with the menu entries below.
Bale's Bot API does not document that method and still returns HTTP 501;
the menu may be empty even though the commands work when typed. Telegram
accepts `setMyCommands`.

`/broadcast`, `/message`, and `/unsend` ack the webhook as soon as the admin
gets the “started” line, then fan out in the background. Holding the HTTP
request open for every DM used to time out nginx/Bale and make later
commands look dead until the container restarted.

An admin `/message` or `/broadcast` compose draft is cancelled by `/start`
(and the other menu commands). Bare text and `ble.ir/…` paths stay in the
draft so a broadcast body is not mistaken for a greeting.

Source: [`server/src/bale/webhook.ts`](../server/src/bale/webhook.ts),
[`server/src/index.ts`](../server/src/index.ts).

## How to type a command

`parseBotCommand` is loose on purpose. Bale’s composer often omits `/`.

Accepted shapes:

```
/start
start
Start
/find_game
/find-game
find_game
/join@secret_hitler_bot ABC123
/join ABC123
ABC123          ← not a command; treated as /join (see below)
```

Rules:

- Leading slash is **optional** for the known names in the table.
- `@botusername` after the name is stripped (group-style mentions).
- Hyphens become underscores (`find-game` → `find_game`).
- Case does not matter (`Start` → `start`).
- Invisible RTL marks are stripped before matching.
- A slash-command the bot does not know (`/foo`) still gets the **start**
  greeting, not silence.
- Bare words that are **not** a known command and **not** a 6-character
  room code also get the start greeting. Chat with the bot and it will
  re-introduce itself.

A **room code** is exactly six letters or digits, `[A-Za-z0-9]{6}`. The
engine generates codes from a slightly smaller alphabet (no `I`/`O`/`0`/`1`)
but the bot accepts any six. Codes are uppercased before lookup.

## Menu vs aliases

These six are registered as the bot menu (`BALE_BOT_COMMANDS`):

| Menu | Description shown in Bale |
|---|---|
| `/start` | شروع بازی |
| `/find_game` | پیدا کردن اتاق باز |
| `/games` | بازی‌های در جریان |
| `/join` | ورود با کد اتاق |
| `/invite` | دعوت دوستان |
| `/create` | ساخت میز تو گروه |

These extra names work in chat but are **not** on the menu:

| Typed | Same as |
|---|---|
| `/help` | `/start` |
| `findgame` | `/find_game` |
| `/game` | `/games` |
| a bare `ABC123` | `/join ABC123` |
| `/start ABC123` | `/join ABC123` |
| `/play-game N` | admin test table (hidden; only user `1902004260`) |
| `/delete CODE` | admin drop live room (hidden; same gate) |

---

## `/start` — greet, and optionally join

**Type:** `/start` · `start` · `/help`

Opens the door. Does not seat anyone. The player still has to tap the
button (or an invite link) so the mini-app loads.

Reply:

```
به راز هیتلر خوش اومدید.

برای پیدا کردن بازی، دکمهٔ پایین رو بزن. با یه کلیک می‌ری سر میز.

خبر، آموزش و چیزای بعدی همه تو کانال می‌آد. بهتره بیای اونجا — دکمهٔ کانال پایینه.

راستی، برای بازی با دوستات کافیه بازو رو بذاری تو گروه و اونجا /create بزنی. خودش برات اتاق می‌سازه و راحت بازی می‌کنید.
```

Buttons: **بازی کن** → mini-app with an empty `startapp` (home, no room code).
**کانال** → `https://ble.ir/secret_hitler_official` (Telegram: `t.me/…`).
The nick is not in the body — Bale Markdown would print `\_` and the mention
would not open.

**`/start CODE`** — if the argument is a 6-character room code, this is
exactly `/join CODE`. That is how a classic `ble.ir/bot?start=CODE` payload
would arrive if Bale ever sent it as a `/start` argument. Mini-app invites
use `startapp=` instead and skip this chat command entirely; the client
reads `start_param` itself.

Unknown private text (`سلام`, `/foo`, …) also returns this greeting.

---

## `/find_game` — list open lobbies

**Type:** `/find_game` · `/find-game` · `find_game` · `findgame`

Same list the mini-app Join tab uses: live rooms still in **lobby**, with
at least one empty seat. Password rooms are included (🔒). In-progress
games are not. The public table
([`public-table.md`](./public-table.md)) is always the first line when
`FEATURE_PUBLIC_TABLE` is on, including `0/6` — the empty-state Create
button is only for a missing table (a bug).

Each line:

```
{name}[ 🔒] — {n}/{max} — کد {CODE}
```

Example when rooms exist:

```
اتاق‌های باز:

Friday — 2/7 — کد ABC123
Secret 🔒 — 4/10 — کد L2YYP4
```

Buttons: one per room, up to **8**, labelled `ورود {CODE}`, each opening
the mini-app with `startapp=CODE`. Tapping one is the same as opening a
share link — the client joins that room (name from Bale, password asked
if the room is locked).

If nothing is joinable:

```
الان اتاق بازی نیست. یکی بساز:
```

Button: **بازی کن** with an empty `startapp` (create flow inside the app).

The bot does **not** join you. It only points at rooms. Seating happens
in the mini-app via `POST /api/rooms/:idOrCode/join`.

---

## `/games` — every live table

**Type:** `/games` · `/game`

Broader than `/find_game`. This is `RoomRepository.listAll()`: lobbies
**and** games that already started. The public table (lobby or, after it
deals, the match that just left it plus the replacement lobby) belongs
here too — [`public-table.md`](./public-table.md). Admin `/play-game`
tables (`میز آزمایش`) stay out of this list.

Each line:

```
{name}[ 🔒] — اتاق انتظار|در حال بازی — {n}/{max} — کد {CODE}
```

Example:

```
بازی‌های در جریان:

Friday — اتاق انتظار — 2/7 — کد ABC123
Night — در حال بازی — 7/7 — کد PLAY01
```

Buttons: only for rooms that are still a lobby **and** not full (same
rule as `/find_game`). You can look at an in-progress table in the text;
you cannot tap into it. Secret Hitler does not allow mid-game joins.

If the server has no live rooms at all:

```
الان هیچ بازی‌ای در جریان نیست. یکی بساز:
```

Button: **بازی کن** with an empty `startapp`.

---

## `/join` — hand someone a specific table

**Type:** `/join CODE` · `/start CODE` · a message that is only `CODE`

Looks up `CODE` in the live-room list (lobby + in-progress). It still does
not seat the player. It validates the table, then returns a deep link
whose `startapp` is that code.

| Situation | Reply |
|---|---|
| No code, or not 6 characters | `کد اتاق رو بعد از دستور بنویس، مثلاً:` `/join ABC123`. If any lobbies exist, their `ورود CODE` buttons are attached; otherwise the empty Play button. |
| No room with that code | `اتاقی با کد {CODE} پیدا نشد.` No button. |
| Room exists but the game has started | `اتاق {name} ({CODE}) دیگه تو اتاق انتظار نیست.` |
| Lobby is full | `اتاق {name} ({CODE}) پره.` |
| Joinable lobby | `ورود به {name} — کد {CODE}` plus a password note if locked: `این اتاق رمز داره؛ تو بازی ازت می‌پرسه.` Button **بازی کن** with `startapp=CODE`. |

A **bare code** (`L2YYP4` as the whole message) is the same as `/join L2YYP4`.
That is the “I was told the code in another chat, I paste it here” path.

The password is **not** typed in Bale. The mini-app asks after open, the
same way a `/join/CODE` browser link does.

---

## `/invite` — share *your* table

**Type:** `/invite` · `/invite CODE`

Builds a message you can forward to friends.

Code resolution, in order:

1. Argument after the command, if it is a 6-character code.
2. Else the room this Bale user last **created or joined in the mini-app**
   (`BaleSeatIndex` — see below).
3. Else it does not know which table you mean:

```
اول تو بازی یه اتاق بساز یا برو تو یکی، بعد /invite بزن.
یا کد رو بنویس: /invite ABC123
```

When it has a code:

```
بیا راز هیتلر — {room name}
کد اتاق: {CODE}
```

Button: **ورود به اتاق** with that `startapp`. The name is the live room’s
name if the table still exists, otherwise the name cached on the seat, otherwise
the code itself. Unlike `/join`, a vanished room still gets a link — the
friend will find out it is gone when the mini-app tries to sit them.

### How the bot knows “your” room

Creating or joining from the mini-app sends Bale `initData` on the HTTP
request. The server validates it, then
`BaleSeatIndex.occupy(baleUserId, { roomId, code, playerId, roomName })`.

`/invite` with no argument reads that seat. Leave / kick / room close
releases it. The mapping is **in memory** (lost on process restart, rebuilt
only when someone creates/joins again). It is not a command; it is why
bare `/invite` works after you have already opened the app.

Source: [`server/src/bale/BaleSeatIndex.ts`](../server/src/bale/BaleSeatIndex.ts),
`bindBaleSeat` in [`server/src/http/routes.ts`](../server/src/http/routes.ts).
Group `/create` occupies a seat for the sender before they open the app.

---

## `/create` — open a table in a group

**Type:** `/create` in a **group** (or `create` / `/create@bot`). Private chat
gets a hint, not a room.

This is the only command the bot answers in a group. Someone types it, the
server opens a real lobby, and the group gets a join button.

What is created:

- Room **name** = the sender’s Bale first name.
- A random 6-character **password** (same alphabet as room codes).
- The sender is already seated as **host** (they still tap the button to open
  the mini-app; that reuses the reserved seat, it does not add a second Ana).
- `originChatId` is this group. Join later asks Bale `getChatMember`.

The posted message id is stored on the room (`originMessageId`). If the host
leaves, the bot **edits that same post** so the join button does not linger:

```
میزبان رفت.
میز {name} بسته شد.
```

Group reply (password is **not** in this message):

```
اتاق ساخته شد.
میز {name} — کد {CODE}
از همین گروه با دکمه بیا تو. از بیرون رمز می‌خواد.
```

Button: **ورود به اتاق**.

Password delivery:

1. The bot DMs the creator the password, so they can invite people who are
   not in the group.
2. If that DM fails (they have never `/start`ed the bot), the password is
   posted in the group as a fallback. Otherwise it stays out of the group
   so a forwarded join button is not enough to sit down.

Join rules for that table:

| Who | Password |
|---|---|
| Creator tapping the button | No — reserved seat. |
| Someone Bale still lists as a member of that group | No. |
| Anyone else (left the group, never in it, browser `/join/CODE`) | Yes. |

The mini-app still does the actual sit (`POST /api/rooms/CODE/join` with
Bale `initData`). Group membership is checked on the server, not in chat.

Private-chat `/create`:

```
این دستور مال گروه‌هاست. تو یه گروه /create بزن تا میز باز بشه.
```

Groups are limited to three `/create`s per minute so a spammy chat cannot
fill the server.

The bot must be **in the group** (it already is if it saw `/create`) so
`getChatMember` can run. Add it as a member before people rely on this.

---

## `/play-game` — admin test table (hidden)

**Type:** `/play-game N` in **private** chat. Not on the bot menu.

Only Bale user `1902004260` (plus any ids in `ADMIN_USER_IDS`). Anyone else
gets no reply — the bot pretends it never heard the command.

`N` is the seat on this device (`1`–`5`). Same Bale account, another phone:
`/play-game 2`. The server does **not** bind that user to one seat
(`BaleSeatIndex.occupy` is skipped).

What it opens:

- One live 5-seat table per admin (`میز آزمایش`, seats `بازیکن ۱`…`بازیکن ۵`).
- Deal runs immediately — no ready check, no min-player gate.
- Hidden from `/find_game` / the Join tab / `/games`.
- Leaving the board (`room:leave`) destroys the table. Dummy seats stay
  connected, so an empty-room check would never fire. `/play-game` again
  opens a fresh one. Claiming another seat on the same table does not
  leave, so that table stays.

Reply:

```
میز آزمایش آماده‌ست. تو صندلی {N} هستی. دکمه رو بزن بری سر میز.
```

Button: **بازی کن** with `startapp=p{N}{CODE}` (e.g. `p1ABC123`). The mini-app
claims that seat via `POST /api/play-game` and lands on the board.

Bad `N`: `شماره صندلی ۱ تا ۵ رو بنویس، مثلاً:` `/play-game 1`.

---

## `/broadcast` — admin retention DM (hidden)

**Type:** `/broadcast` · `/sendall` · `/send-all` in **private** chat. Not on
the bot menu.

Same admin gate as `/play-game`. Anyone else gets no reply.

1. Type `/broadcast`.
2. Bot: «متن پیام رو بفرست.»
3. Send the text (a `ble.ir/…` path or `/start` is still the body, not a
   command).

Sends that text to every private chat that has talked to this bot (`/start` or
any later private command). Mini-app login also adds that messenger id.
A one-time SQL backfill copies existing `profiles.bale_user_id` /
`telegram_user_id` rows. Bale admins reach Bale sitters; Telegram admins
reach Telegram sitters.

Each player DM has the same **بازی کن** button as `/start`. On Bale the body
is Markdown-escaped so a `ble.ir/secret_hitler_official` path does not make
`sendMessage` fail (underscores become `\_` in the wire text). `@username`
mentions stay raw — escaping them prints `\_` and the mention dies. People who
blocked the bot are dropped from the list.

Empty list:

```
کسی نیست که براش بفرستم. هر کی تو چت خصوصی /start بزنه، می‌مونه تو لیست.
```

While sending, then when done:

```
دارم می‌فرستم به N نفر.
تموم شد. رسید به N نفر.
```

(If some DMs fail: `M تا نرسید.` on the second line.)

The admin gets the same player DM, plus these status replies.

---

## `/message` — admin DM to chosen ids (hidden)

**Type:** `/message` in **private** chat. Not on the bot menu.

Same admin gate as `/play-game`. Anyone else gets no reply.

1. Type `/message`.
2. Bot: «آیدی‌ها رو با ویرگول بفرست.»
3. Send ids (`123,456` — ASCII `,` or Persian `،`).
4. Bot: «متن پیام رو بفرست.»
5. Send the text.

A **بازی کن** button is attached, same as `/broadcast`. Ids that never started
the bot may fail; they are not dropped from the `/start` list.

---

## `/unsend` — delete the last admin DMs (hidden)

**Type:** `/unsend` · `/undo` · `/retract` in **private** chat. Not on the bot
menu.

Same admin gate as `/play-game`. Anyone else gets no reply.

Deletes the last `/broadcast` or `/message` the bot sent (the player DMs, not
the admin status lines). Type `/unsend`. No extra step.

Empty list (nothing stored, or already unsent):

```
پیامی نیست که پاک کنم.
```

While deleting, then when done:

```
دارم آخرین پیام رو از N نفر پاک می‌کنم.
تموم شد. از N نفر پاک شد.
```

(If some deletes fail: `M تا پاک نشد.` on the second line.)

Only the latest blast is kept. An older round that went out before this
command cannot be pulled back.

---

## `/users` — admin list of reachable DMs (hidden)

**Type:** `/users` · `/user` in **private** chat. Not on the bot menu.

Same admin gate as `/play-game`. Anyone else gets no reply.

Lists every private chat still on the `/start` subscriber list for this bot —
the same set `/broadcast` would DM. Failed broadcasts drop blockers, so this is
“who has not blocked” as far as the bot knows (chat ids only, no names).

Empty list:

```
کسی نیست که بلاک نکرده باشه. هر کی تو چت خصوصی /start بزنه، می‌مونه تو لیست.
```

With people:

```
کسایی که بلاک نکردن (N نفر):

123
456
```

If the list is too long for one message, trailing ids are omitted with
`… و M نفر دیگه`.

---

## `/delete` — admin drop a live room (hidden)

**Type:** `/delete CODE` in **private** chat. Not on the bot menu.

Same admin gate as `/play-game`. Anyone else gets no reply.

Looks up the live table by its 6-character code (lobby or in progress,
including hidden `/play-game` tables and the public table) and destroys it:
sitters get `room:closed` (`HOST_LEFT`), tokens and seats are revoked, and a
group `/create` post is edited closed when that room had one. If the public
lobby was the one deleted, `ensurePublicLobby` heals it afterward.

| Situation | Reply |
|---|---|
| No code, or not 6 characters | `کد اتاق رو بعد از دستور بنویس، مثلاً:` `/delete ABC123` |
| No live room with that code | `اتاقی با کد {CODE} پیدا نشد.` |
| Room removed | `اتاق {name} ({CODE}) پاک شد.` |

---

## What happens after they tap the button

The chat bot’s job is over. The mini-app boots, reads `start_param` /
`startapp`, and if it is a 6-character code, joins that room the same way
a browser `/join/CODE` link does (name from Bale, password if needed).
`p1ABC123` is the admin `/play-game` seat, not a join code.

```
ble.ir/{bot}?startapp=L2YYP4
        ↓
Bale WebView, initData + start_param=L2YYP4
        ↓
client NavigationService / BaleService.offerJoinCode
        ↓
POST /api/rooms/L2YYP4/join
        ↓
waiting room
```

Admin `/play-game`:

```
ble.ir/{bot}?startapp=p1ABC123
        ↓
offerPlaySeat → POST /api/play-game
        ↓
waiting room → game (already dealt)
```

Empty `startapp` opens the app with no pending room (home / play).

---

## Not commands (related Bale traffic)

These talk to Bale but **never** as a slash-command in private chat.

| Thing | Where | What |
|---|---|---|
| Support letter | Mini-app Support screen → `POST /api/support` | Bot posts a letter to `BALE_SUPPORT_CHAT_ID` (help / suggestion / criticism). There is no `/support` in chat. |
| Kick-vote notice | Server, after a table kick vote | Same support group gets a tally (requester, target, yes/needed, kicked or not). |
| Mini-app login | `POST /api/auth/bale` | Validates `initData`, returns first name + saved avatar. Not a chat command. |

---

## Env the bot needs

From [`.env.example`](../.env.example):

| Variable | Role |
|---|---|
| `BALE_BOT_TOKEN` | From BotFather. Empty = no bot, no webhook. |
| `BALE_BOT_USERNAME` | Nick in `ble.ir/…` links. Default `@secret_hitler_bot`. |
| `BALE_WEBHOOK_URL` | HTTPS URL Bale POSTs updates to (port 443 or 88). |
| `BALE_WEBHOOK_SECRET` | Appended to the webhook path; also accepted as `X-Telegram-Bot-Api-Secret-Token`. Required when registering. |
| `BOT_SET_WEBHOOK` | `true` only on the VPS (compose default). Local `pnpm dev` must leave it unset so boot does not steal production `setWebhook`. |
| `BALE_SUPPORT_CHAT_ID` | Group for support letters and kick notices. Not used by chat commands. |
| `ADMIN_USER_IDS` | Extra Bale ids for `/play-game`, `/broadcast`, `/message`, `/unsend`, `/users`, and `/delete`. `1902004260` is always allowed. |

Copy for new replies: [`docs/persian.md`](./persian.md) (register **بله**).
Tests: [`server/src/bale/commands.test.ts`](../server/src/bale/commands.test.ts).
