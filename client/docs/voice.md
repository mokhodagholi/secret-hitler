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

Chrome (mic in chat, mute-other from the seat menu, live mic badge on
seats, seat rings) renders only while `flags.enabled('voice')`.

Join starts muted after opening night. The browser microphone prompt
waits until day — it must not sit on the role cards. Tap the mic to speak.
If this browser still has no mic, unmute opens a dialog that retries
`getUserMedia` from that tap so the permission sheet can appear again.
The client waits for the microphone before `voice:join`, queues `voice:peer`
until the recv transport exists, and passes the server’s ICE list
(STUN/TURN) into mediasoup transports. Capture asks for echo cancellation,
noise suppression, and auto-gain.
Do not tap the capture stream with Web Audio: Chrome then turns AEC off
and Ravi/music ride the send track. Speaking rings read outbound RTP
levels instead. This player’s seat still updates locally so the green glow
does not wait on the websocket. `.you.speaking` overrides the cyan “you”
outline and the portrait pulses.

Live mic vs muted on a seat comes from `voice:peer`, not the game
snapshot — unmute does not wait for the next round. A crossed mic is
their table mute. Local mute-other is a speaker-off badge on the other
side of the portrait so it does not look like they muted themselves.

The green seat ring is a websocket flag (`voice:speaking`). A speaking
frame also marks that seat live, so a missed unmute still shows the
glow on other devices. It does not mean the other browser is playing RTP.
Remote audio is attached to a
`<video playsinline>` node so Chrome on phones can play the MediaStream,
the server consumer starts paused and is resumed after attach
(`voice:resumeConsumer`), and playback starts muted then unmutes on a
tap. Local mute-other zeros volume, pauses the element, and disables
the track so a later unlock cannot start them again.

Ravi, music, and sound effects keep playing locally. Capture asks for
echo cancellation so this device’s speakers (including that bed) are
subtracted from the send track — only the player’s voice goes out the
mic. Two devices in the same physical room can still leak: AEC only
cancels *this* device’s output. Headphones remove that.

## Bale / Safari

`getUserMedia` in the Bale mini-app WebView is unproven. Keep the flag
off in production until a real device on that path can produce and
consume. iOS Safari needs a user gesture before play; remote playback
already fails open if autoplay is blocked.

## Tests

Do not spin a real DTLS session in jsdom. Stub `getUserMedia`, inject
`{ voice: true }` on the harness / `buildServer`, and assert chrome and
`voice:*` frames. Server gameplay tests use `MemoryMediaBackend`.
