# Changelog

Player-facing notes for each app version. The file is
[`client/src/changelog/releases.json`](../client/src/changelog/releases.json).
Newest release first. The version on that file's top entry must match
`client/package.json`.

This is what people read after an update. It is not a commit log.

To review the card locally, open `/?update=1` while `pnpm dev` is
running. That uses the sample notes in
[`client/src/changelog/preview.ts`](../client/src/changelog/preview.ts),
not the shipped file. Dismiss drops the query flag. Production ignores
the flag.

## When to write

Only if a player can **see or feel** it: a new thing they can do, a bug that
bit them, a change in how the table plays.

Skip: refactors, tests, docs, Docker/VPS, types, internal wiring, copy
tweaks nobody asked for.

| Commit | Changelog? | `bump` |
|---|---|---|
| `feat` they can notice | yes | `minor` |
| `feat` that breaks how they already play | yes | `major` |
| `fix` they can notice | yes | `patch` |
| `fix` only servers/Docker/types would notice | no | — |
| `chore` `docs` `test` `style` `refactor` | no | — |

One commit → at most one new release. Several player-facing bits in that
commit become several `changes` under the same version. If the working tree
already bumped the version and added the entry for this work, do not bump
again.

## File shape

```json
{
  "releases": [
    {
      "version": "0.2.0",
      "bump": "minor",
      "date": "2026-09-20",
      "changes": [
        {
          "kind": "feat",
          "fa": "…",
          "en": "…"
        }
      ]
    }
  ]
}
```

- `bump`: `major` | `minor` | `patch`
- `kind`: `feat` | `fix`
- `date`: `YYYY-MM-DD`
- `fa` / `en`: one short sentence each, written **separately**

## Bump `client/package.json`

Take the current `version` and apply `bump`:

- `major` → `1.4.2` → `2.0.0`
- `minor` → `1.4.2` → `1.5.0`
- `patch` → `1.4.2` → `1.4.3`

Leave `server`, `shared`, and `bale-bot` alone. Players read the client
version (Settings).

Prepend the new object at the top of `releases`. Then stage
`client/src/changelog/releases.json` and `client/package.json` with the rest
of the commit.

## Voice — write twice, never translate

`fa` and `en` are two originals. Do not translate the commit subject. Do not
translate one locale from the other.

Tone: **formal, friendly, of the table**. Like a briefing after a session —
warm and clear, never slang, never a press-release or an engineer’s note.
This is the **اعلامیه** register in [`persian.md`](./persian.md): «شما» /
«می‌توانید», not table-talk «می‌تونی / یه». English is composed, not
chatty. Both may speak of the table, the archive, a briefing, an
announcement — never of files, tickets, or refactors.

### Don't / Do

| Don't | Do |
|---|---|
| fa: «بهبود مدیریت اتصال مجدد» (translated, technical) | fa: «اگر ارتباط لحظه‌ای قطع شود، میز برجا می‌ماند.» |
| en: «Improves reconnection handling» | en: «A brief loss of connection no longer clears the table.» |
| fa: «بعد از هر آپدیت می‌فهمی چی عوض شده.» (slang) | fa: «پس از هر به‌روزرسانی، اعلامیهٔ تغییرات روی میز گذاشته می‌شود.» |
| en: «Updates now tell you what landed.» (chatty) | en: «Each update now arrives with a briefing of what changed at the table.» |

One sentence per change. No file names, no ticket ids, no “we refactored”.
If it needs a second sentence, it is two changes.
