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

## Voice — tell them, like a native

`fa` and `en` are two originals. Do not translate the commit subject. Do not
translate one locale from the other.

Write the line you would **say to a player** after the sitting. They should
know what they can do now, or what stopped going wrong. Model the shipped
notes in [`releases.json`](../client/src/changelog/releases.json), not
[`preview.ts`](../client/src/changelog/preview.ts).

This is the **اعلامیه** register in [`persian.md`](./persian.md): «شما» /
«می‌توانید», not table-talk «می‌تونی / یه». English is a native telling you —
direct, not chatty, not a poem.

1. What can they do now, or what stopped biting them?
2. Forget the commit. Say that in that language. Cut it.
3. Read it aloud. If a native would not tell a friend that way, rewrite.

Drop: how it was built (browser, webview, tap timing, “announced three
times”, a field kept above the keyboard). Drop metaphor that hides the fact
(“the table does not fold”, «میز سخن می‌گوید»). Skip chrome so small you
would not mention it when telling someone what changed.

Seats, votes, the host, Ravi — name those when that is what changed. Do not
personify the table to sound warm.

### Don't / Do

| Don't | Do |
|---|---|
| fa: «بهبود مدیریت اتصال مجدد» (engineer) | fa: «اگر ارتباط قطع شود، بازی ادامه می‌یابد.» |
| en: «Improves reconnection handling» | en: «If the connection drops, the game keeps going.» |
| fa: «اتاق انتظار دیگر خاموش نیست؛ می‌توان با میز سخن گفت.» (literary) | fa: «پیش از شروع بازی می‌توانید در اتاق انتظار با بقیه گفتگو کنید.» |
| en: «Should the host leave, the table does not fold.» (empty) | en: «If the host leaves, the game keeps going and another player becomes host.» |
| en: «The microphone now asks to be heard the moment it is touched.» | en: «Tapping the microphone asks for permission right away.» |
| fa: «بعد از هر آپدیت می‌فهمی چی عوض شده.» (slang) | fa: «پس از هر به‌روزرسانی، اعلامیهٔ تغییرات نشان داده می‌شود.» |
| en: «Updates now tell you what landed.» (chatty) | en: «After an update, a short note of what changed is shown.» |

One sentence per change. No file names, no ticket ids, no “we refactored”.
If it needs a second sentence, it is two changes.
