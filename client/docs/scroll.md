# Scrollbars

One look, taken from the surface. The OS bar is never shown.

`themed-scroll` lives in [`client/src/styles/_mixins.scss`](../src/styles/_mixins.scss)
and is applied once on `*` in [`global.scss`](../src/styles/global.scss).
Do not restyle `::-webkit-scrollbar` at a call site.

## Theme

Set the `--scroll-*` tokens on the surface that owns the scroll, with a mixin:

| Surface | Mixin | Where |
|---|---|---|
| Navy / blue shell, cards, briefing | `scroll-navy` | gold-to-brown thumb, no track fill |
| Wood / paper (chat, rooms board) | `scroll-wood` | same gold-to-brown thumb, no track fill |

The gutter is always clear. Only the thumb is painted.

## Adding a scrolling pane

`overflow-y: auto` is enough. The bar is already themed. If the pane sits on
a wood or paper surface, `@include scroll-wood` on that surface — not on the
scroller itself.
