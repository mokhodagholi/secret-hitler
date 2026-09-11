# Scrollbars

Moved to [`client/docs/scroll.md`](../../client/docs/scroll.md) — the
single source.

Short version: do not restyle `::-webkit-scrollbar` at a call site. The bar
is themed globally (`themed-scroll` in `client/src/styles/_mixins.scss`).
Navy/gold is the default; wood/paper surfaces `@include scroll-wood`.
