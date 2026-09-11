# Native feel

Moved to [`client/docs/native-feel.md`](../../client/docs/native-feel.md) —
the single source.

Short version: this is a phone app in a WebView, not a website. No text
selection on chrome, no autocomplete/spellcheck on fields, no tap highlight,
no pull-to-refresh, no iOS zoom on focus. Defaults live in `global.scss` and
`index.html`; restore selection only on `input` / `textarea`.
