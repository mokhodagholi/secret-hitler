# Audio

Moved to [`client/docs/audio.md`](../../client/docs/audio.md) — the single source.

Short version: all playback goes through one singleton,
`client/src/services/SoundService.ts`, reached via `AppContext`. Sounds are
registry entries (`EFFECTS` / `MUSIC`); add a file under
`client/src/assets/sounds/`, add one registry line, then call
`sound.play('key')` or `sound.playMusic('key')`. Playback is gated on the
Sound Effects / Music settings toggles — callers never check them. See the doc
for adding sounds, event wiring, and testing.
