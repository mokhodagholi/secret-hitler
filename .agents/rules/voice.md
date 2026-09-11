# Table voice

Moved to [`client/docs/voice.md`](../../client/docs/voice.md) — the single source.

Short version: open-floor audio on the game page, behind `flags.voice`.
`VoiceService` joins when the flag is on and the view is in-game. Callers
never check the flag. Self-mute is table-wide; mute-other is local only.
`GameEngine` does not know about mediasoup.
