# Public table — one waiting room

Shipped behind `FEATURE_PUBLIC_TABLE` (default off). Turn the flag on to
put every stranger at **one** sit-and-wait lobby on Join. Find Match is
not this product. Hosted Create stays only while the flag is off.

Secret Hitler needs five to ten people in the **same** lobby. Free Create
splits a small pool: three in one room, two in another, host leaves, Join
looks dead. The public table is the cafe — people sit, talk, and the host
starts when they want.

## Verdict

| Question | Answer |
|---|---|
| Always-on public lobby, pinned on Join | **Yes.** Exactly one room in `Phase.Lobby`. |
| First sitter is host | **Yes.** They Start from **5 to 10** when they want. |
| Host leave destroys the room | **No.** Host migrates to a connected sitter. The room dies only when it is empty. |
| Empty lobby stays on Join | **Yes.** Play never sees “no rooms” because the salon is missing. |
| When it deals, a new empty salon | **Yes**, in the same turn, so Join does not flicker empty. |
| Find Match queue / Accept at 6 | **No.** That skipped the waiting room. |
| Stranger Create / extra waiting rooms | **No.** One lobby. In-progress games are separate. |
| Group `/create` | Opens an **unlocked** table for that chat and lists it on Join (does not sit the salon). |
| Own-table button | Measurement only. Records `own_room_prompt` / `own_room_want`. Does **not** spawn a second lobby. |
| 5-minute lobby AFK | Yes, guests who sit unready. Do not AFK-kick the host. |
| Cap / spillover | Max **10**. Full → wait for the next salon after deal. No second public lobby in v1. |

## What a player actually does

```
Home → Play → Join (one row: میز عمومی)
  → sit, chat, Ready
  → host Start once 5–10 people are connected
  → that table becomes a normal in-progress game
  → Join already shows a fresh empty میز عمومی
```

Home does not queue. There is no Create tab while the flag is on.

A quieter link on Join: **میز خودم**. It opens a dialog explaining the
shared table. The bottom button records that they still want a private
room (`own_room_want`). It does not create one.

## Locked rules

### One public lobby at a time

Exactly **one** room in `Phase.Lobby` is `kind: 'public'`. No password.
Created on boot (and after a restart, restored or recreated). Extra empty
public lobbies left in `live_rooms` after a deploy are dropped. It is
**kept** when it goes empty.

When that room **leaves lobby** (a successful start), the server creates
the next empty public table in the same turn. The game that just started
keeps its code and seats.

V1 does **not** open a second public lobby when the current one is 10/10
and still waiting. The row stays, marked full.

### Host

The first sitter is host (`hostId`, Start, kick if `lobbyKick` is on).
Host leave **vacates like a guest**; a connected player gets the gavel
(`newHost`). Disconnect uses the same grace as hosted rooms.

After a process restart, this empty public lobby must **not** be deleted.
Join and `/find_game` call `ensurePublicLobby` so a missing evergreen
seat heals itself.

### Start

Host `startGame` when connected sitters are in **5..10**. The host
chooses the moment — no all-Ready gate on the public table, no Accept
modal, no auto-deal at six.

Private hosted rooms (flag off) still require Ready + host Start.

### Lists, pin, name

Join lists **only** the public lobby while the flag is on. Copy:

| Locale | Name |
|---|---|
| fa | میز عمومی |
| en | Public table |

Empty state “no rooms” only if the public table is missing (a bug).
`/find_game` must not send people to Create when the salon exists.

In-progress matches stay on `/games`. They are not a second waiting room.

## Lobby AFK

If a **connected guest** sits unready in lobby for **5 minutes**, kick
them (not a ban). Do **not** kick the host.

A **disconnected** lobby seat is dropped after **15 seconds**. Host
migrates if someone else is still connected.

## Table kick and ban

Lobby: host kick when `lobbyKick` is on (seat only, no ban). In-game
kick vote is unchanged. Ban list is still only in-game kicks.

## Own-table interest

`product_events`:

| Name | When |
|---|---|
| `own_room_prompt` | They opened the dialog |
| `own_room_want` | They tapped the bottom “I want my own table” button |

Do not treat `own_room_want` as a Create. If that number stays high,
revisit private tables later.

## What stays the same

- Server is the source of truth.
- `GameEngine` is the only mutator.
- `MIN_PLAYERS` / role mix / night deal do not change.
- Mid-game join still forbidden.
- Lobby-fill DMs still fire at 2–4 seats — now that is this salon.

## Implementation map

| Piece | Where |
|---|---|
| Create / keep one empty lobby | `SocketHandler.ensurePublicLobby` |
| First sitter host; Start 5–10 | `shared/src/engine/GameEngine.ts` |
| Join lists the salon (plus group `/create` tables) | `GET /api/rooms` when `publicTable` |
| Sit the salon (HTTP create) | `SocketHandler.sitPublicLobby` |
| Own-table crumbs | `POST /api/product/own-room` |
| Join-only Home | `HomeScreen` Play → `RoomsScreen` join |
| Copy | `fa.ts` **and** `en.ts` — [`persian.md`](./persian.md) **میز** |
| Flag | `publicTable` in [`flags.ts`](../shared/src/flags.ts), default off |

## Follow-ups (not v1)

- A second public lobby when the first is full and still in lobby.
- Actually creating a private table from `own_room_want`.
- Fill DMs at 1 seat on the salon.

## What we will not do

- Several always-on public tables “to give choice.” That re-fragments
  the same small pool.
- Find Match (stay on Home until six, then Accept). People never talk.
- Letting Join Create open a competing stranger lobby while the flag is on.
