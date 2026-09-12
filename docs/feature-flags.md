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
response so screens never paint with a stale default-off catalog. Joining a
room also applies `flags` from the `authed` WebSocket frame — that is the
live switch, so a missed HTTP fetch cannot hide in-game chrome. Callers
read `flags.flags.voice` in JSX (the store) or `flags.enabled('voice')` in
handlers. A failed or malformed response keeps the defaults (everything
off). Tests inject a preloaded service (or `{ flags: { voice: true } }` on
`buildServer`) and do not set `process.env`.

When `voice` is off, the client hides every mic control and the server rejects
`voice:*` frames. See [`client/docs/voice.md`](../client/docs/voice.md).

When `publicTable` is off, the server does not create the evergreen Join lobby.
AFK kicks in every lobby still run. See [`public-table.md`](./public-table.md).
