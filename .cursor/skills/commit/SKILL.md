---
name: commit
description: Commits the current git changes after checking git status and writing a message from project docs. Use when the user runs /commit or asks to commit.
disable-model-invocation: true
---

# Commit

it commit the changes depend on the docs

it should check the git status for the changes, and have some rules before, and use that to write proper commit message

## Before committing

Read [`docs/commit-messages.md`](../../../docs/commit-messages.md). That file is the source of truth for message format. If other `docs/` files are relevant to the change (naming, comments, testing), follow them too.

If the diff is a player-facing feat or fix, also read
[`docs/changelog.md`](../../../docs/changelog.md) and apply it **before**
staging: native `fa`/`en` notes in `client/src/changelog/releases.json`, bump
`client/package.json`. Skip that for work a player would not notice. Do not
bump twice if this change already added the entry.

Run these in parallel:

```bash
git status
git diff
git log -15 --format='%s'
```

Also run `git diff --staged` if anything is already staged.

## Rules

Do not commit until all of these hold:

- There is a real change (modified, staged, or untracked files that belong to this work).
- No secrets (`.env`, credentials, keys, tokens).
- Do not update git config, skip hooks, amend, force-push, or run interactive git (`-i`).
- Do not add unrelated junk (stray screenshots, local notes) unless the change is specifically those files.
- Do not commit if there is nothing to commit.

If the working tree is clean, stop and say so. Do not create an empty commit.

## Message

Write the message from the status, the diff, and `docs/commit-messages.md`.

Format:

```
type(scope): Capitalized summary
```

- Conventional Commits: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`.
- Keep `type(scope):` lowercase. Capitalize the first word of the subject.
- Prefer a scope when the change is localized (`client`, `server`, `shared`, `mono`).
- Subject focuses on **why**, not a file list.
- Body is optional. Use 1–3 sentences (or short bullets) when the diff needs context.

### Do / Don't

| Don't | Do |
|---|---|
| `feat(client): add font` | `feat(client): Adds font` |
| `fix(server): handle reconnect` | `fix(server): Handles reconnect` |
| `refactor(shared): rename phase` | `refactor(shared): Renames phase` |

Match recent `git log` tone: present tense, capitalized subject, concise body.

## Changelog

When `docs/changelog.md` says this commit is player-facing:

1. Prepend one release (newest first) with `bump`, `date` (`YYYY-MM-DD`), and
   `changes` whose `fa` and `en` are written independently — never translated
   from the commit subject or from each other. Native, meaning first: what
   they can do now, or what stopped going wrong (see `docs/changelog.md`).
2. Bump `client/package.json` to match that release's `version`.
3. Stage those two files with the rest of the work.

## Commit

1. Stage only the files that belong to this change (including changelog + version when required).
2. Commit with a HEREDOC (never `-i`, never `--no-verify`):

```bash
git commit -m "$(cat <<'EOF'
type(scope): Capitalized summary

Optional body.

EOF
)"
```

3. Run `git status` after the commit and report success (hash/subject) or the hook error.

If a hook rejects the commit, fix the issue and create a **new** commit. Do not amend unless the user explicitly asks and the amend safety rules in the user git protocol all hold.
