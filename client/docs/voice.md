# Table voice

Open-floor audio on the game page. Everyone who is alive and connected can
speak; everyone else listens. Self-mute is table-wide. Mute-other is
local only (this browser, not the wire).

Ships dark behind `flags.voice` (`FEATURE_VOICE`). Production stays off until
the Bale WebView / Safari microphone path is verified.

## Who owns what

The server is still the source of truth for *who may produce*. The client
never applies game rules to voice. `GameEngine` does not know about
mediasoup.

| Piece | Lives |
|---|---|
| Flag | [`shared/src/flags.ts`](../../shared/src/flags.ts) |
| WS frames | [`shared/src/types/events.ts`](../../shared/src/types/events.ts) |
| SFU | [`server/src/voice/`](../../server/src/voice/) (`VoiceHub` + mediasoup) |
| Signaling | existing `/ws` in [`SocketHandler`](../../server/src/ws/SocketHandler.ts) |
| ICE | UDP mediasoup ports + coturn in [`docker-compose.yml`](../../docker-compose.yml) |
| Client | [`VoiceService`](../src/services/VoiceService.ts) |

`VoiceHub` watches engine events (death, leave, disconnect) and pauses
producers. It is not a phase.

## Client

[`VoiceService`](../src/services/VoiceService.ts) joins when the view is
in-game and the flag is on. Callers never check the flag or the listen
toggle — this class does. Settings `voiceEnabled` is “hear the table”
(remote playback), not self-mute.

Chrome (mic in chat, mute-other from the seat menu, seat rings) renders
only while `flags.enabled('voice')`.

Join starts muted. Tap the mic to speak. The client waits for the
microphone before `voice:join`, queues `voice:peer` until the recv
transport exists, and passes the server’s ICE list (STUN/TURN) into
mediasoup transports.

## Bale / Safari

`getUserMedia` in the Bale mini-app WebView is unproven. Keep the flag
off in production until a real device on that path can produce and
consume. iOS Safari needs a user gesture before `AudioContext` / play;
the analyser already fails open if the context is blocked.

## Tests

Do not spin a real DTLS session in jsdom. Stub `getUserMedia`, inject
`{ voice: true }` on the harness / `buildServer`, and assert chrome and
`voice:*` frames. Server gameplay tests use `MemoryMediaBackend`.
