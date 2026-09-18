# Lobby fuller-table nudge

In-app offer that pulls sitters out of a thin lobby into the waiting room
that already has more people. Uses the live `GET /api/rooms` list — never a
fake count. Not a DM; that path is still [`lobby-fill.md`](./lobby-fill.md).

## Why

Hosted Create splits a small pool: two in one room, four in another, nobody
deals. A sitter who has been waiting can move to the fuller table instead of
staring at an empty circle.

## When it fires

The waiting room, after the player has sat **this** lobby:

1. Phase is still lobby (not an admin `/play-game` table).
2. They have been in that room for **≥60s**.
3. This table still has **fewer than 6** connected seats.
4. Another **unlocked** lobby has **strictly more** connected seats and is not
   full.
5. No other lobby overlay is already up (leave, start, kick, invites).

Then a modal names the live seat count. **Join that table** leaves the current
seat and sits the fuller room (`joinRoom` already vacates the previous table).
**Stay here** dismisses.

The same check runs again every **3 minutes** with a fresh room list. Sitting
a new room restarts the 60s wait. If the public salon is the only listed
lobby, the offer never appears.

## Copy

fa (میز):

```
یه میز N نفره منتظر شماست.
برید اون‌جا تا بازی زودتر شروع بشه.
```

Button: **بریم اون میز**. Stay: **همین‌جا می‌مونم**.

## Measurement

| Name | When |
|---|---|
| `lobby_nudge_prompt` | The modal opened (`roomCode` = current, `payload.toCode` / `seats`) |
| `lobby_nudge_join` | They sat the offered table (`roomCode` = target, `payload.fromCode`) |

## Code map

| Piece | Path |
|---|---|
| Pick the fullest joinable lobby | `client/src/screens/WaitingRoomScreen/lobbyNudge.ts` |
| Timer + modal | `client/src/screens/WaitingRoomScreen/WaitingRoomScreen.tsx` |
| Crumb POST | `POST /api/product/lobby-nudge` in `server/src/http/routes.ts` |
| Copy | `fa.ts` **and** `en.ts` — `waiting.nudge*` |
