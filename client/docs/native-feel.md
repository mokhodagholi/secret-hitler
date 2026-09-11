# Native feel

This client is a phone app that happens to run in a WebView. It is not a
website. Safari chrome, text carets, autocomplete, pull-to-refresh, and the
grey tap flash are bugs.

If a player can tell they are in a browser, the shell failed.

Default language is **fa**, inside **Bale**. Design for a thumb on a
430px column. Desktop is a letterboxed phone, not a second layout.

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
- `-webkit-touch-callout: none` on `body`.
- Images / SVG / video: no drag, no select, no callout. Fields restore
  selection.
- `viewport-fit=cover`. Safe-area padding on splash, waiting-room, chat —
  not yet on `Screen` / `BottomNav`.
- `pressable` on shared buttons. `type="button"` everywhere.
- Bale `BackButton` via [`BaleService`](../src/services/BaleService.ts).
  `ready()` is called; `expand()` is not.
- Themed scrollbars, screen-enter motion, no full page loads.

Not true yet — do these when you touch the shell or a field. Ranked.

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

Every `input` / `textarea` (today: [`TextInput`](../src/components/TextInput/TextInput.tsx),
Rooms `Field`, chat composer) ships these, in the component, not at the
call site:

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
`0.95rem` on `TextInput` is under — that is why the whole navy column
jumps when you type a room name. Floor field type at 16px. The label can
stay small.

After dismiss, do not leave the page scrolled up. The table shell should
keep `svh` / `dvh` stable; pad the **composer** with
`visualViewport` (or `env(keyboard-inset)`) instead of shrinking the whole
screen.

`enterkeyhint="send"` on chat. Enter already sends (Shift+Enter for a
newline) — the key cap should say so.

### The WebView is the app frame

[`index.html`](../index.html):

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
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

Bale, in `BaleService.boot`:

- `webApp.expand()` — we already type it; call it next to `ready()`.
- Header / background color to `$navy-950` if the SDK exposes it, so the
  messenger chrome matches the table.
- Closing confirmation **while a game is live**, if the SDK exposes it —
  a swipe-down that kills the room is the least native thing in this app.
- Haptic on Ja/Nein, enact, execute — one tick, through `BaleService`, not
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

## Suggested next (not wired)

In the order I would land them. Cheap CSS first; Bale APIs when you are
already in `BaleService`.

1. **Global select / tap / overscroll / text-size-adjust** in `global.scss`.
   Highest "this is a website" tell, one file.
2. **Dumb fields** — the attr table on `TextInput`, Rooms `Field`, chat
   `<textarea>`. `enterkeyhint` included.
3. **16px input floor** so iOS stops zooming the shell.
4. **`format-detection` + `theme-color`** in `index.html`.
5. **`:focus-visible`** instead of leftover `:focus` outlines.
6. **Safe-area on `Screen` / `BottomNav`**, delete the one-offs that duplicate
   them.
7. **`webApp.expand()`** next to `ready()`.
8. **Tap-to-copy** for the join code (and toast), never a text highlight.
9. **Composer vs. keyboard** — keep the table still; lift only the chat bar.
10. **Closing confirmation** for a live game (Bale/Telegram-style), so a
    swipe does not resign the table.
11. **Haptics** on the three violent beats: vote, policy, execute. Optional
    light impact on primary buttons.
12. **Header/background color** on the WebApp, if the loaded `miniapp.js`
    actually has the setters — probe before typing a fantasy API.

Do not chase: pinch-zoom lock via `user-scalable=no`, hiding the themed
scrollbar (the [scroll](./scroll.md) mixin is the look), or selectable chat
transcripts. Those are either hostile or a different product.
