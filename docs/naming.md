# Naming Conventions

## Use descriptive names, not cryptic abbreviations

Variables, parameters, and local bindings must read as words. Avoid 1–2
character names and terse abbreviations even when the scope is small — clarity
beats keystrokes.

This applies everywhere, including:

- destructured service handles and accessors,
- `For` / `map` / callback parameters,
- local aliases for imported functions.

Prefer destructuring and using the real exported name directly over inventing a
short alias.

### Do / Don't

| Don't | Do |
|---|---|
| `const t = i18n.formatMessage` | `const { formatMessage } = i18n` |
| `const fm = i18n.formatMessage` | `const { formatMessage } = i18n` |
| `const s = settings.settings` | `const state = settings.settings` |
| `<For each={items}>{(c) => ...}</For>` | `<For each={kitPieces}>{(piece) => ...}</For>` |
| `onChange={(v) => set(v)}` | `onChange={(value) => set(value)}` |
| `.find((l) => l.code === ...)` | `.find((language) => language.code === ...)` |

### Examples from this codebase

```tsx
// Good — destructure and use the exported name as-is
const { formatMessage } = useApp().i18n;
formatMessage('settings.players', { count: state.playerCount });

// Good — descriptive loop parameters
<For each={buildKit(formatMessage)}>
  {(piece) => <KitPiece {...piece} />}
</For>
```

### Reasonable exceptions

- Conventional math/index counters (`i`, `x`, `y`) in a tight numeric loop.
- Established domain shorthands already used consistently in the file.
