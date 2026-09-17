# Feature flags

Server-owned switches so a feature can ship dark and turn on without a
client rebuild. The catalog lives in
[`shared/src/flags.ts`](../shared/src/flags.ts). There is no player-facing UI
for the flags themselves.

## Catalog

| Flag | Env | Default |
|---|---|---|
| `voice` | `FEATURE_VOICE` | off |
| `publicTable` | `FEATURE_PUBLIC_TABLE` | off |
| `lobbyKick` | `FEATURE_LOBBY_KICK` | off |
| `gameKick` | `FEATURE_GAME_KICK` | off |
| `onboarding` | `FEATURE_ONBOARDING` | off |
| `roomPassword` | `FEATURE_ROOM_PASSWORD` | off |
| `lobbyFill` | `FEATURE_LOBBY_FILL` | off |

Adding a flag: one name in `FLAG_NAMES`, one default in `DEFAULT_FLAGS`, one
`FEATURE_<NAME>` key in [`.env.example`](../.env.example). Unknown `FEATURE_*`
keys are ignored.

`true` / `1` (any case) turn a flag on. Missing, empty, `false`, or anything
else stays the default — today that means off.

## How the client sees them

Production (`server/src/index.ts`) passes
`parseFeatureFlags(process.env)` into `buildServer`. `GET /api/flags`
returns `{ flags }` rebuilt from the catalog only — never a dump of env.

The client [`FeatureFlagService`](../client/src/services/FeatureFlagService.ts)
fetches that once at boot (`cache: 'no-store'`). Splash waits for that
response so screens never paint with a stale catalog. `publicTable`
defaults off so Join still shows Create until the fetch confirms the
salon. Joining a
room also applies `flags` from the `authed` WebSocket frame — that is the
live switch, so a missed HTTP fetch cannot hide in-game chrome. Callers
read `flags.flags.voice` in JSX (the store) or `flags.enabled('voice')` in
handlers. A failed or malformed response keeps the defaults. Tests inject
a preloaded service (or `{ flags: { voice: true } }` on `buildServer`) and do
not set `process.env`.

When `voice` is off, the client hides every mic control and the server rejects
`voice:*` frames. See [`client/docs/voice.md`](../client/docs/voice.md).

When `publicTable` is off, Home Play opens create/join and the server does
not keep an evergreen lobby. When on, Join shows **one** public table
(first sitter is host, Start from 5–10); Create is hidden; group `/create`
sits that salon. Find Match is not used. AFK kicks in every lobby still
run. A disconnected lobby seat is dropped after 15 seconds (no ban). See
[`public-table.md`](./public-table.md).

When `lobbyKick` is off, hosted rooms hide host-kick in the waiting room and
the server rejects lobby `player:kick` / lobby `kick:request`. When on, a
lobby kick clears the seat only — no ban; the player may sit again.

When `gameKick` is off, in-game kick votes and mid-game host kick stay dark;
the server rejects those frames too.

When `onboarding` is off, the first-run Sit offer and look table stay dark.
The table itself is client-only (no tutorial HTTP or room). See
[`onboarding.md`](./onboarding.md).

When `roomPassword` is off, Create hides the password field and the server
ignores a password on HTTP create. Group `/create` opens an unlocked lobby
(no DM / fallback password). Join still asks for a password when a room was
locked while the flag was on.

When `lobbyFill` is off, the server does not DM warm players to fill waiting
lobbies. When on, needy 2–4 seat tables get short deep-link invites. See
[`lobby-fill.md`](./lobby-fill.md).
