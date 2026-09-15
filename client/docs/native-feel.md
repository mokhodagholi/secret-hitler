# Native feel

This client is a phone app that happens to run in a WebView. It is not a
website. Safari chrome, text carets, autocomplete, pull-to-refresh, and the
grey tap flash are bugs.

If a player can tell they are in a browser, the shell failed.

Default language is **fa**, inside **Bale** or **Telegram**. Design for a thumb
on a 430px column. Desktop is a letterboxed phone, not a second layout.

## Principles

- **Chrome is not a document.** Labels, seats, help, rules, cards — look, don't
  highlight. The only places a caret belongs are real fields (name, room code,
  password, chat composer).
- **One global default.** Put the kills in
  [`global.scss`](../src/styles/global.scss) and
  [`index.html`](../index.html). Do not sprinkle `user-select: none` on every
  card. Restore the exception on `input` / `textarea` (already the pattern).
- **Fields look like fields, not search boxes.** No browser suggest, no
  spellcheck dots, no iCloud password sheet, no iOS pinch-zoom on focus.
- **The page never moves.** Scroll lives inside panes ([scrollbars](./scroll.md)).
  The document does not bounce, refresh, or zoom.
- **Press, not hover.** Hover is a mouse leftover. Every tap uses
  `pressable` (or equivalent `:active`). A stuck `:hover` after a tap is a bug.

## In the tree today

Already true:

- Body does not scroll (`overflow: hidden`); the shell is `100dvh` × 430px.
- `user-select: none` on `html` (fields restore it). No tap flash, no
  pull-to-refresh, no double-tap zoom, no iOS text-size inflate.
- `-webkit-touch-callout: none` on `body`. Right-click / long-press save is
  blocked except on fields (`index.tsx`).
- Images / SVG / video: no drag, no select, no callout.
- Fields (`TextInput`, Rooms `Field`, `TextArea`, chat composer) ship
  `nativeFieldAttrs` — no suggest, no spellcheck. Passwords use
  `new-password`. Composer / letter use `enterkeyhint="send"`. Field type is
  16px so iOS does not zoom the shell.
- `viewport-fit=cover`, `format-detection=telephone=no`, navy `theme-color`.
- Safe-area on `Screen` padding (`--screen-pad-*`). Bleed screens (home,
  rooms) cancel those tokens with `bleed-out-of-screen` and apply the
  inset on their own chrome. Table, splash, waiting-room, player cards
  use `Screen fill` and own the viewport.
- `pressable` on shared buttons. `type="button"` everywhere. Back control
  and chat tools are 44×44.
- Bale `BackButton` via [`miniapp.ts`](../src/services/miniapp.ts).
  `ready()` runs on boot. Show/hide is `Bale.WebApp.BackButton` (not
  Telegram's) — Bale's API is 1.x, so `Telegram.BackButton.show()` is a
  no-op and the in-app arrow is already hidden. Navigation is in-memory;
  do not `history.replaceState` inside the WebView ([Bale Mini App
  docs](https://docs.bale.ai/miniapp) — BackButton / in-memory routing).
  Do not call `expand()` — Bale and Telegram both
  stay a compact sheet, not a full-height WebView. Telegram may disable
  vertical swipes so a table swipe does not dismiss the WebView.
- Themed scrollbars, screen-enter motion, no full page loads.
- Waiting-room invite is a tap-to-copy share link, not a highlightable code.

Still open — do not invent the API:

- Closing confirmation while a game is live.
- Haptics on vote / enact / execute.
- Bale header / background color, if `miniapp.js` actually exposes setters.

## Law

### The player cannot select the table

`user-select: none` (and `-webkit-user-select`) on `html, body, #root`.
Restore `text` only on `input, textarea`.

Long-press on a seat name, a rule, or a help line must not grow iOS handles
or a Copy / Look Up / Translate callout. Per-component `user-select: none`
on the table is leftover — the global rule makes it redundant.

**Room codes are not selected either.** A tap-to-copy control is native;
dragging a highlight across `7K2Q` is a website. Chat bubbles stay
unselectable unless we add a real long-press menu later.

### Fields do not autocomplete

Every `input` / `textarea` ships these via
[`nativeFieldAttrs`](../src/components/nativeField.ts), in the component, not
at the call site:

| Attr | Value | Why |
|---|---|---|
| `autocomplete` | `off` | Chrome / Safari suggest |
| `autocorrect` | `off` | iOS QuickType (names and Persian especially) |
| `autocapitalize` | `none` | Join codes and names are not sentences |
| `spellcheck` | `false` | Red dots under a display name |
| `enterkeyhint` | `done` / `go` / `send` | Return key matches the action |

Passwords that are *room locks*, not logins: `autocomplete="new-password"`
(or a nonsense `name`) so iOS does not pop Save Password. Do not wrap
create/join in a `<form>` unless you want that sheet.

Join code may use `autocapitalize="characters"` if we ever force A–Z.
`inputmode="search"` and `type="search"` draw browser chrome — never.

### A tap is not a web tap

In `global.scss`:

```scss
html {
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  touch-action: manipulation; // kills 300ms delay + double-tap zoom
  overscroll-behavior: none;  // no pull-to-refresh, no rubber-band of the page
}
```

Inner scrollers get `overscroll-behavior: contain` so a list that hits the
end does not bounce the WebView behind it. Drag handles already use
`touch-action: none` — keep that.

`:focus` outline after a thumb tap is a website. Use `:focus-visible` for
keyboard; touch/mouse get the existing gold `focus-within` on fields, nothing
else.

### The keyboard does not zoom the shell

iOS zooms any field whose computed font-size is under **16px**.
Field type is 16px. The label can stay small.

After dismiss, do not leave the page scrolled up. The table shell is
`100dvh` capped to `100%` so an Android WebView that shrinks for the
keyboard is not clipped. Do not set `virtualKeyboard.overlaysContent`.

[`KeyboardService`](../src/services/KeyboardService.ts) reads
`visualViewport` and writes `--keyboard-inset` **except on Android**. The
screen pads by that inset so the field stays in the visible viewport on
iOS. Do not `translateY` a focused field — Android IME treats a
transformed caret as lost and the keyboard fights the page. Do not
`window.scrollTo` while a field is focused. The document does not scroll;
inner panes may. Do not shrink `dvh` in JS. Do not collapse a textarea
to `height: 0` to autosize it on Android. Chat composers stay
uncontrolled — writing `value=` on every keystroke dismisses the IME.

`interactive-widget=resizes-content` is on the viewport meta so Android
Chrome / WebView shrinks the layout with the keyboard instead of overlaying
it. The composer then sits at the bottom of the column without a JS hop.

`KeyboardForm`'s sticky submit button reads `bottom: var(--keyboard-inset,
0px)`, not `bottom: 0`. The pane's own height does not shrink for an
on-screen keyboard, so a plain `bottom: 0` sticks the button to where the
keyboard now covers it — the inset lifts it to sit just above the keyboard
instead. Any other sticky action inside a `[data-keyboard-form]` (e.g.
`RoomsScreen`'s `.primary`) needs the same `bottom` offset.

`enterkeyhint="send"` on chat. Enter already sends (Shift+Enter for a
newline) — the key cap should say so.

### The WebView is the app frame

[`index.html`](../index.html):

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
<meta name="format-detection" content="telephone=no" />
<meta name="theme-color" content="#051528" />
```

`format-detection` stops iOS turning a name or a code into a blue tel: link.
`theme-color` paints the status bar navy, not Safari grey.
`maximum-scale=1` / `user-scalable=no` are redundant if `touch-action:
manipulation` is on, and they fight accessibility on a real browser tab —
skip them.

Safe-area belongs on the **shell**, once: `Screen` padding and `BottomNav`
`bottom`. Do not keep inventing `calc(... + env(safe-area-inset-bottom))`
per screen unless that screen owns the viewport (the table, splash).

Bale, in `BaleMiniApp.boot` / Telegram in `TelegramMiniApp.boot`:

- Do not call `webApp.expand()`. Compact sheet is the intended open on
  both Bale and Telegram.
- Telegram: `disableVerticalSwipes` so a table swipe does not dismiss
  the WebView.
- Header / background color to `$navy-950` if the SDK exposes it, so the
  messenger chrome matches the table.
- Closing confirmation **while a game is live**, if the SDK exposes it —
  a swipe-down that kills the room is the least native thing in this app.
- Haptic on Ja/Nein, enact, execute — one tick, through `MiniApp`, not
  from the overlay. No-op outside the mini-app.

### Hit targets and chrome

Thumbs miss 24px icons. Tools, nav items, and dialog buttons stay at least
**44×44**. The gear in chat and the bottom nav are the usual offenders.

No in-app `href` that looks like a link (underline, visited purple, "open in
new tab"). Navigation is `NavigationService` + `type="button"`.
No `window.alert` / `confirm` — `ConfirmDialog` and toasts already exist.

Images stay undraggable. Cards and seats should `preventDefault` on
`contextmenu` if a desktop WebView still offers Save Image.

## Don't / Do

| Don't | Do |
|---|---|
| Selectable help text, seat names, rules | Global `user-select: none`; fields restore it |
| Browser suggest on name / code / chat | `autocomplete/autocorrect/spellcheck` off on the component |
| Grey flash on tap | `-webkit-tap-highlight-color: transparent` |
| Pull-to-refresh mid-vote | `overscroll-behavior: none` on `html` |
| iOS zoom into a 15px input | Field font-size ≥ 16px |
| Hover-only press feedback | `pressable` / `:active` |
| Default blue `:focus` ring after a tap | `:focus-visible` |
| iOS "Save Password" on a room lock | No login-shaped `<form>`; `autocomplete="new-password"` |
| Highlight the join code to copy it | One copy button |
| `type="search"` / native `<select>` | Our fields and pickers |
| Safe-area copied into every screen | `Screen` + `BottomNav` (table/splash excepted) |
| Pinch-zoom the board | `touch-action: manipulation` on the shell |
