# Mini apps — Bale, Telegram, one table

How Bale and Telegram share one Mini App API, and why players from either
messenger (or the browser) sit at the **same** tables.

Command copy still lives in [`bale-bot.md`](./bale-bot.md). This file is
the host architecture.

The game already runs inside Bale as a mini-app. This is how Telegram
gets the same features, how the two hosts share one API, and why
players from Bale, Telegram, and the browser sit at the **same**
tables.

## Verdict

| Question | Answer |
|---|---|
| Shared Mini App SDK, Bale and Telegram each implement it | Yes. |
| Same Postgres, same live rooms, they see each other | Yes. Do this. |
| Merge a Bale login with a Telegram login into one account | No. Not automatically. |

Secret Hitler needs five to ten people. Splitting the pool by messenger
would leave empty lobbies. The engine already treats a seat as a name,
an avatar, and a `playerId`. It does not know which app opened the
WebView. One world is the cheap path, not a special mode.

What must stay namespaced is **login**, not the table: Bale user `9`
and Telegram user `9` are different people. Profiles, seats, and
`/invite` key on `(platform, userId)`. The board never shows which
app someone came from.

## What is already true

The server is the source of truth. One `RoomRepository`, one
`live_rooms` table, one WebSocket. A browser tab on localhost already
joins a room that a Bale mini-app created, if it has the six-character
code (and the password when the table is locked).

| Layer | Today | Gap for Telegram |
|---|---|---|
| Engine / WS / snapshots | Platform-blind | None. |
| Postgres `games`, `live_rooms` | One database | None. |
| Postgres `profiles` | `clientId` + `baleUserId` | Add `telegramUserId`. Do not reuse `baleUserId`. |
| Client host | `BaleService` talks to `window.Bale.WebApp` | Same methods on `window.Telegram.WebApp`. |
| Invite URL | `ble.ir/{bot}?startapp=CODE` ([`miniAppLink.ts`](../shared/src/net/miniAppLink.ts)) | `t.me/{bot}/{app}?startapp=CODE` for Telegram; the **code** is what crosses apps. |
| Bot API client | [`bale-bot/`](../bale-bot/) already takes `baseUrl` (default `tapi.bale.ai`) | Construct the same class with `https://api.telegram.org`. |
| Chat commands | [`server/src/bale/commands.ts`](../server/src/bale/commands.ts) | Keep the logic. Inject `startLink`. Two webhooks. |
| Group `/create` | `originChatId` + Bale `getChatMember` | Store `originPlatform` too. Ask the bot that owns that chat. A Telegram user is not a member of a Bale group. |

Bale copied Telegram’s Mini App and Bot API. `initData` HMAC, Back
button, `start_param`, webhook secret header
(`X-Telegram-Bot-Api-Secret-Token`) are already the Telegram shapes.
This is an adapter job, not a second game.

## One world

### Why yes

- Filling a table is the product. Two isolated communities fight that.
  The same problem exists **inside** one world when every lobby needs a
  host: see [`public-table.md`](./public-table.md).
- `PublicPlayer` is name, card, seat, office, alive. No messenger
  field. Nobody at the table should learn “this one is from Telegram”
  — that is meta in a hidden-role game.
- `/find_game` and the Join tab already list `RoomRepository`
  lobbies. Both bots should keep listing that same list.
- History and a later ELO live on finished games, not on a Bale id.
  One `games` table is the seed for that ([`schema.ts`](../server/src/db/schema.ts)).

### What a player actually does

```
Bale WebView ─┐
Telegram WebView ─┼─► same HTTPS origin ─► same WS ─► same Room
Browser /join/CODE ─┘
```

Invite is a six-character code. Each host also has a convenience deep
link that opens **that** host already holding the code:

| Who copies | What they copy | What the friend should use |
|---|---|---|
| Bale mini-app | `https://ble.ir/{bot}?startapp=CODE` | Friend in Bale taps it. |
| Telegram mini-app | `https://t.me/{bot}/{shortName}?startapp=CODE` | Friend in Telegram taps it. |
| Localhost / LAN | `https://localhost…/join/CODE` | Browser. |
| Anyone, any host | the code itself | Join screen, or `/join CODE` in either bot. |

A Bale player who wants a Telegram friend at the table sends the
**code** (or the friend types `/join CODE` to the Telegram bot). Do
not try to open `ble.ir` inside Telegram or `t.me` inside Bale.

Production chat replies still never paste `mrfantastic.ir`. Each bot
pastes **its** mini-app link. The waiting-room share button copies the
link for **this** WebView’s platform. The code stays visible either
way — that is the cross-play join key.

### Group tables stay locked to that group’s messenger

`/create` in a Bale group still means: members Bale still lists in
that chat skip the password; everyone else types it. “Everyone else”
includes Telegram and the browser. Same rule the other way for a
Telegram group.

That is not a hole. The password is how you invite across apps (and
how you invite someone who left the group). The bot DMs it to the
creator today; keep that.

Store origin as `{ platform, chatId, messageId }`. Calling Telegram
`getChatMember` with a Bale chat id would be a wrong-bot miss, not a
free sit.

### Identity — same database, not the same person

| Key | Meaning |
|---|---|
| `playerId` | Seat in this live room. Ephemeral. |
| `clientId` | Browser UUID. Profile fallback when there is no messenger login. |
| `(bale, userId)` | Bale account. Name lock, `/invite`, avatar. |
| `(telegram, userId)` | Telegram account. Same jobs, different map. |

Do **not**:

- Treat numeric ids as global. They collide.
- Auto-link “same first name” or “same username”.
- Write Telegram ids into `bale_user_id`.

A later “link my Bale and Telegram” setting can exist. It is a
conscious action, not a launch requirement. Until then one human with
both apps is two profiles and can sit twice if they try — same as two
browser tabs with two `clientId`s. Do not build a cross-app device
ban for v1.

`POST /api/auth/…` validates `initData` against **both** bot tokens
when both are configured and trusts whichever HMAC matches. The
client does not get to claim a platform.

### Could we not share tables?

Yes: two servers, or a `platform` filter on `listPublic()`. That is
worse. It is extra code to make the game harder to start. Only split
if a real abuse or ToS problem shows up (it has not).

## Client SDK

Screens and services must stop importing `BaleService` as “the
host”. They talk to a `MiniApp` interface. Bale and Telegram are
classes behind it. The browser is a third implementation (today’s
localhost mock).

```ts
type MiniAppPlatform = 'bale' | 'telegram' | 'browser';

interface MiniAppUser {
  id: number;
  firstName: string;
}

interface MiniApp {
  readonly platform: MiniAppPlatform;
  readonly user: Accessor<MiniAppUser | null>;
  isMiniApp(): boolean;
  usesNativeBack(): boolean;
  syncBackButton(canGoBack: boolean): void;
  initData(): string | undefined;
  boot(settings: SettingsService, nav: NavigationService): Promise<void>;
}
```

That is today’s [`BaleService`](../client/src/services/BaleService.ts)
with the global renamed. Callers already used only that surface
(`initData()`, `user()`, `usesNativeBack()`, `syncBackButton`,
`boot`). `AppContext` exposes `miniApp`, not `bale`.

### Detect which class to construct

Load both official scripts outside loopback/LAN (Bale
`miniapp.js`, Telegram `telegram-web-app.js`). They hang off
different globals, so they can coexist.

Pick one:

1. `Telegram.WebApp.initData` non-empty → `TelegramMiniApp`
2. `Bale.WebApp.initData` non-empty → `BaleMiniApp`
3. Else Telegram global present → Telegram (empty initData still a
   WebView)
4. Else Bale global → Bale
5. Else `BrowserMiniApp` (no-op chrome, no name lock)

Do not trust User-Agent as the primary signal. The signed `initData`
string is the login; the global is only which wrapper to call.

`start_param` / `tgWebAppStartParam` already feeds
[`joinCodeFromStartApp`](../client/src/services/startApp.ts). Keep
that. Both hosts inject the same query flag.

### Native chrome

| Method | Bale | Telegram | Browser |
|---|---|---|---|
| `ready()` | Yes | Yes | no-op |
| `BackButton` | Yes | Yes | in-app header only |
| `expand()` | Do **not** call (compact sheet — [`native-feel.md`](../client/docs/native-feel.md)) | Do **not** call | — |
| Closing confirmation while a game is live | Still open | `enableClosingConfirmation` | — |
| Header / background color | If `miniapp.js` grows setters | `setHeaderColor` / `setBackgroundColor` to the navy shell | `theme-color` |
| Haptics on vote / enact | Still open | `HapticFeedback` when we want it | — |
| Disable vertical swipes | n/a | `disableVerticalSwipes` so a table swipe does not dismiss the WebView | — |

V1 of Telegram is **parity with Bale** (ready, back, startapp join,
name lock, initData on create/join/support/profile). Closing
confirmation, haptics, header color are the native-feel follow-ups
already listed as open — implement them on the Telegram class, no-op
on Bale until that API exists. Do not call `expand()`.

## Server

### One interface, two runtimes

[`BaleRuntime`](../server/src/bale/webhook.ts) / `BaleMessenger` is
already the send surface (`sendMessage`, `editMessageText`,
`getChatMember`, `setWebhook`, `setMyCommands`). Rename in place to
`Messenger` / `MessengerRuntime` and give it `kind`.

Boot **zero, one, or two** runtimes:

```
BALE_BOT_TOKEN     → MessengerRuntime { kind: 'bale',     bot: new BaleBot({ token, baseUrl: 'https://tapi.bale.ai' }) }
TELEGRAM_BOT_TOKEN → MessengerRuntime { kind: 'telegram', bot: new BaleBot({ token, baseUrl: 'https://api.telegram.org' }) }
```

Do not fork `bale-bot/` into a second HTTP client. The package is
already Telegram-compatible. Keep the name for now (rename is a
follow-up, not a blocker).

Webhooks stay separate so a secret leak on one platform is not a
write on the other:

- `POST /api/bale/webhook/:secret`
- `POST /api/telegram/webhook/:secret`

Both call the same `handleBotText` / `createGroupRoom`. The runtime
supplies `startLink(code)` and `seats`.

### Commands

[`commands.ts`](../server/src/bale/commands.ts) is platform-blind
except `baleStartLink` → `ble.ir`. Replace that with
`runtime.startLink(code)`:

- Bale: `https://ble.ir/{nick}?startapp={code}`
- Telegram: `https://t.me/{nick}/{shortName}?startapp={code}`

Persian register **بله** in [`persian.md`](./persian.md) can stay the
bot voice for both. It is “spoken, «تو», one-to-one with the bot”,
not Bale-the-company. If Telegram later wants a different register,
that is a copy change in one file, not a second command tree.

`setMyCommands` works on Telegram (Bale still 501s). Same menu.

### Auth, join, seats

| Endpoint | Change |
|---|---|
| `POST /api/auth/bale` | Keep as an alias, or fold into `POST /api/auth/miniapp`. Validate against every configured token. Return `{ id, firstName, avatar, platform }`. |
| `POST /api/rooms` / `join` | `initData` as today. Bind the seat under the platform that verified. |
| `PUT /api/profile` / support | Same. Support letters go to **that** runtime’s `SUPPORT_CHAT_ID`. |
| Kick-vote notice | Same support group as the requester’s platform. Skip if they sat from the browser. |

`BaleSeatIndex` becomes a map keyed by `platform + userId` (one
index for the process is enough; each webhook reads its own kind).
Bare `/invite` on the Telegram bot must not return a Bale-only seat
for a coincidentally equal numeric id.

Reserved seats from group `/create` still work: the creator opens
**the same platform’s** mini-app, `initData` matches, join reuses
the player row instead of adding a second Ana.

### Env

Alongside the existing `BALE_*` keys in [`.env.example`](../.env.example):

| Variable | Role |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Empty = no Telegram bot, no webhook. Same pattern as Bale. |
| `TELEGRAM_BOT_USERNAME` | Nick in `t.me/…` links. |
| `TELEGRAM_WEBAPP_SHORT_NAME` | Mini App short name from BotFather (`t.me/bot/shortName`). |
| `TELEGRAM_WEBHOOK_URL` | HTTPS URL Telegram POSTs to. |
| `TELEGRAM_WEBHOOK_SECRET` | Path segment and/or `X-Telegram-Bot-Api-Secret-Token`. |
| `TELEGRAM_SUPPORT_CHAT_ID` | Telegram group for letters and kick tallies. |

`PUBLIC_URL` stays the HTTPS origin of **this** server. Both Mini
Apps load that origin. BotFather (Telegram) and Bale’s mini-app
settings both point here.

## Feature parity (Bale today → Telegram + shared tables)

| Feature | Telegram | Cross-play |
|---|---|---|
| Mini-app login, lock name to first name | Same `initData` HMAC | Two profiles; same room. |
| `startapp=CODE` → join screen | Same `start_param` | Code is universal. |
| `/start` `/find_game` `/games` `/join` `/invite` `/create` | Same parser and replies | Lists are the live repo, not “Telegram rooms”. |
| Group `/create`, password, origin membership | Telegram `getChatMember` | Other-app players type the password. |
| Support letter | Telegram support group | Independent desks. |
| Kick-vote tally | Telegram support group | Independent desks. |
| Native back | Telegram `BackButton` | — |
| Waiting-room invite | `t.me/…/app?startapp=` | Code still on the card for the other app. |
| Saved player card | `telegram_user_id` column | Not shared with the Bale row until an explicit link. |
| Table voice (`flags.voice`) | Same mediasoup | Already shared. |
| Browser localhost | Unchanged `/join/CODE` | Already shared. |

## BotFather (Telegram only)

1. Create the bot, copy the token into `TELEGRAM_BOT_TOKEN`.
2. `/newapp` — title, description, icon. Web App URL = `PUBLIC_URL`.
3. Short name → `TELEGRAM_WEBAPP_SHORT_NAME`.
4. Set the webhook to `TELEGRAM_WEBHOOK_URL` + secret (the server
   already does this for Bale on boot).
5. Add the bot to the support group; paste that chat id.

HTTPS and a real domain are required. Local Telegram testing uses
the same `pnpm dev:https` / tunnel pattern as phone-on-LAN Bale,
or a throwaway BotFather app pointed at the tunnel.

## How to ship it

Shipped. Remaining native-feel items (closing confirmation, haptics)
stay on the Telegram class as follow-ups.

## Files (when this leaves paper)

Do not search the whole repo. Open these:

| Area | Open |
|---|---|
| Client host | `client/src/services/miniapp.ts` (`MiniApp`, `BaleMiniApp`, `TelegramMiniApp`, `BrowserMiniApp`, `createMiniApp`) |
| App wiring | `client/src/services/AppContext.tsx`, `client/index.html` |
| Start links | `shared/src/net/miniAppLink.ts` |
| Auth / join / webhook | `server/src/http/routes.ts`, `server/src/bale/` (rename folder when the interface lands) |
| Bot HTTP | `bale-bot/src/http-client.ts` (`baseUrl`) |
| Profiles | `server/src/db/schema.ts`, `server/src/profiles/` |
| Map | [`AGENTS.md`](../AGENTS.md) |

## Not in v1

- Account linking UI.
- Platform badge on a seat.
- A second command tree or a second Persian catalog.
- Payments, Stars, Telegram CloudStorage, biometric, MainButton as
  a game control.
- Renaming the `bale-bot` package (cosmetic).
- A feature flag to *disable* cross-play. If we ever need that, it
  is a one-line filter on `listPublic` — do not pre-build it.
