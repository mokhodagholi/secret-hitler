# Bale bot — commands

The Bale bot is a concierge: **private chat** for finding and joining tables,
and **one group command** (`/create`) that opens a table in that chat. It does
not play Secret Hitler and does not sit at a seat. Useful replies hand the
player a `ble.ir` mini-app link so the game itself opens inside Bale.

Replies are spoken Iranian Persian (register **بله** in
[`persian.md`](./persian.md) — address is «تو»). Copy lives in
[`server/src/bale/commands.ts`](../server/src/bale/commands.ts). Change the
strings there, not here.

## What a player actually gets

Every useful reply is some mix of:

1. **Text** — a short Persian message. Bale always parses it as Markdown, so
   command names in the greeting are written `/find-game` (hyphen), never
   `/find_game`. An underscore in Markdown italicizes and the send fails.
2. **A button** — almost always «بازی کن» or «ورود به اتاق», opening
   `https://ble.ir/{bot}?startapp=` or `…?startapp=CODE`.
3. **The same URL in the text** as `[بازی کن](url)` / `[ورود به اتاق](url)`,
   so it still works if Bale rejects the keyboard (the webhook retries
   without buttons when that happens).

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
Bale’s Bot API still returns HTTP 501 for that call; the menu may be empty
even though the commands work when typed.

Source: [`server/src/bale/webhook.ts`](../server/src/bale/webhook.ts),
[`server/src/index.ts`](../server/src/index.ts).

## How to type a command

`parseBotCommand` is loose on purpose. Bale’s composer often omits `/`.

Accepted shapes:

```
/start
start
Start
/find-game
/find_game
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

---

## `/start` — greet, and optionally join

**Type:** `/start` · `start` · `/help`

Opens the door. Does not seat anyone. The player still has to tap the
button (or an invite link) so the mini-app loads.

Reply:

```
به راز هیتلر خوش اومدید.

برای شروع، دکمهٔ پایین رو بزن. اگه لینک دعوت داری، همون رو باز کن تا مستقیم بری سر میز.

/find-game — اتاق باز پیدا کن
/games — بازی‌های در جریان
/join CODE — با کد اتاق بیا تو
/invite — لینک دعوت دوستات
/create — تو گروه میز باز کن

[بازی کن](https://ble.ir/secret_hitler_bot?startapp=)
```

Button: **بازی کن** → mini-app with an empty `startapp`. The client lands on
home (no room code).

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
games are not.

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
[بازی کن](https://ble.ir/secret_hitler_bot?startapp=)
```

Button: **بازی کن** with an empty `startapp` (create flow inside the app).

The bot does **not** join you. It only points at rooms. Seating happens
in the mini-app via `POST /api/rooms/:idOrCode/join`.

---

## `/games` — every live table

**Type:** `/games` · `/game`

Broader than `/find_game`. This is `RoomRepository.listAll()`: lobbies
**and** games that already started.

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
[بازی کن](…)
```

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
[ورود به اتاق](https://ble.ir/secret_hitler_bot?startapp=CODE)
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

Group reply (password is **not** in this message):

```
اتاق ساخته شد.
میز {name} — کد {CODE}
از همین گروه با دکمه بیا تو. از بیرون رمز می‌خواد.
[ورود به اتاق](https://ble.ir/secret_hitler_bot?startapp=CODE)
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

## What happens after they tap the button

The chat bot’s job is over. The mini-app boots, reads `start_param` /
`startapp`, and if it is a 6-character code, joins that room the same way
a browser `/join/CODE` link does (name from Bale, password if needed).

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
| `BALE_WEBHOOK_SECRET` | Appended to the webhook path; also accepted as `X-Telegram-Bot-Api-Secret-Token`. |
| `BALE_SUPPORT_CHAT_ID` | Group for support letters and kick notices. Not used by chat commands. |

Copy for new replies: [`docs/persian.md`](./persian.md) (register **بله**).
Tests: [`server/src/bale/commands.test.ts`](../server/src/bale/commands.test.ts).
