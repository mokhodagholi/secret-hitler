# Public table — one room that is always there

Shipped behind `FEATURE_PUBLIC_TABLE` (default off). Hosted rooms, Join,
`/find_game`, and `/games` still work as they did. Turn the flag on to keep
one public lobby on Join.

Secret Hitler needs five to ten people in the **same** lobby. Today every
table is born when someone taps Create and dies when that host leaves. With
a small player pool that splits the room: three people in one empty lobby,
two in another, nobody at five, Join looks dead. The product is filling a
table ([`mini-app.md`](./mini-app.md)); this is how the lobby itself helps.

## Verdict

| Question | Answer |
|---|---|
| Always-on public lobby, no host, pinned on Join | Yes. Do this. |
| When it starts, spawn a fresh empty public lobby | Yes. Join must never lack one. |
| Show it on Join **and** in `/games` / in-progress lists | Yes. Pin it on Join. |
| Every sitter has a **Start** button, separate from Ready | No. The public table has no Start and no share link. |
| When the table is full (10), everyone must Accept | Yes — 15 s. Silence is a kick (not a ban), then deal if a legal table remains. |
| 5-minute lobby AFK kick on **every** room | Yes, with the host exception below. |
| Vote to remove someone in the public lobby, same as in-game | Yes. Half yes → kick, report, and ban from **that** room. |

The diagnosis is right. The public table fills to ten, then everyone
Accepts. There is no host gavel and no Start button. The locked chrome
and the full-table Accept rule are below.

## Why this helps a small pool

Hosted rooms ask a stranger to **found** a table and then wait. Most people
will not. They open Join, see nothing (or a 2/10 waiting on a host), and
leave. One evergreen seat — always listed, always joinable, nobody's
"room" — is the same trick Among Us public lobbies and Codenames clubs
use: concentrate whoever is online **now**.

Private Create stays. Friends who want a password, a Bale group
`/create`, or a host who decides when to deal still have that. The public
table is the default place for everyone else.

## What a player actually does

```
Open Join (or /find_game)
  → public table is the first row, even at 0/10
  → sit and wait (no Ready, no Start, no share link)
  → when 10 connected sitters fill the table, everyone gets Accept
  → they have 15 seconds; if they do not Accept, they are kicked (not banned)
  → if enough seats remain, the rest deal
  → a new empty public table appears on Join immediately
```

The started game is now an ordinary in-progress room. It shows on
`/games`. It is **not** the public table anymore. The replacement is.

## Locked rules

### One public lobby at a time

Exactly **one** room in `Phase.Lobby` is the public table. It has no
password, no host, no `originChatId`. It is created on boot (and after a
restart, restored or recreated). It is never destroyed because it went
empty.

When that room **leaves lobby** (a successful start), the server creates
the next empty public table in the same turn so Join does not flicker
empty. The game that just started keeps its code and seats; it is a
normal match from then on.

V1 does **not** open a second public lobby when the current one is 10/10
and still waiting. The row stays, marked full. Spillover is a follow-up
if the pool actually fills a table.

### No host

`GameEngine.addPlayer` today makes the first sitter the host, and
`startGame` is host-only. Host leave destroys the room
(`SocketHandler.dropSeat`). None of that may apply here.

- The public table's `hostId` stays empty. `isHost` is false on every seat.
- Nobody can kick as host. Table kick-vote (in-game) is unchanged once
  the match has started.
- Last sitter leaving does **not** destroy the room. The empty lobby
  stays in `RoomRepository` and on disk.
- After a process restart, reconnect grace must **not** delete an empty
  public lobby the way it drops empty hosted rooms. Join and `/find_game`
  also call `ensurePublicLobby` so a missing evergreen seat heals itself.

Hosted rooms keep today's host button and host-leave destroys-the-room
behaviour. Host kick in the waiting room is behind `lobbyKick`
(`FEATURE_LOBBY_KICK`, default off).

### Full table → everyone Accepts

Sitting is the seat. Hosted rooms keep Ready and the host Start / share
link. The public table has none of those.

When **connected sitters = maxPlayers** (10), every connected player who
has not Accepted gets a modal they cannot ignore. One action: **Accept**.
Clock **15 s**. There is no Nein on this modal — staying and refusing
is what the kick is for. Leave is still Leave.

If they Accept in time, they stay. If the clock hits and they have not
Accepted, they are kicked with the away / did-not-choose reason. They
are **not** banned; they can sit the same public table again.

People who already Accepted do **not** get that modal. They see the
table waiting on the others.

If someone leaves or drops so the table is no longer full, the window
closes. Filling to 10 opens it again.

Then the engine looks at who is left:

- Remaining connected `>= minPlayers` (5) and all remaining Accepted →
  deal on those seats.
- Remaining connected `< minPlayers` → **do not deal**. The people who
  Accepted stay seated. Wait until the table is full again.

Ten sit, two ignore Accept, eight remain — the game can start. Ten sit,
six ignore Accept, four remain — wait for more people. Do not pretend
a 4-player Secret Hitler began.

Do **not** add this Accept window to hosted rooms. A private table
already has a host who is supposed to wait for their group.

### Lists, pin, name

`RoomSummary` grows a flag (`kind: 'public' | 'hosted'` or
`pinned: true`). Join, `/find_game`, and `/games` sort the public lobby
**first**. Copy is a proper name, not “Untitled Room”:

| Locale | Name |
|---|---|
| fa | میز عمومی |
| en | Public table |

Join always shows that row, including `0/10`. Empty state “no rooms”
only appears if the public table is somehow missing (a bug). `/find_game`
must not send people to Create when the public table exists.

Home **Find Game** should open the Join tab, not Create. The public
table is the thing Find Game is for.

The public lobby also appears in `/games` (it is a live room). When it
starts, the in-progress match stays on `/games`; the new empty public
lobby is pinned on Join **and** listed on `/games` as اتاق انتظار.

## Lobby AFK — every room

If a **connected** player sits idle in lobby for **5 minutes**, the
server kicks them and tells them they were away.

Idle means: hosted room, Ready is off; public table, Accept has not
been tapped.

| | Rule |
|---|---|
| Clock starts | On sit, or when they flip ready → unready (hosted). |
| Clock resets | Hosted: Ready. Public: Accept. Disconnect clears the clock. |
| Pauses | While the Accept modal is open, and while a kick vote is open. |
| Message | `room:closed` with a dedicated reason (not `KICKED` / `HOST_LEFT`). Client copy: they were away; they can join again. |
| Who | Every non-host seat, every lobby. On the public table there is no host, so every seat. |

**Do not kick the host of a hosted room for this.** Host leave still
destroys that room. A host waiting for friends from a group chat is
the intended use of Create. Kicking them after five minutes of unreadiness
would delete the table they just opened.

A **disconnected** lobby seat is dropped after **15 seconds** if they do
not reconnect. That is a kick, not a ban — they can sit again. The same
clock applies to every lobby seat, including the host of a hosted room
(host migrates if someone else is still connected).

Silent drops (phone kill / sleep without a clean WebSocket close) are
detected when the client stops pinging (~40s idle). Then the 15s lobby
clock starts.

This AFK rule is for people who are online and idle. `startGame` still
keeps only `connected` seats.

Five minutes is long enough to take a call and short enough that a
corpse seat does not sit on a 4/5 table for an hour.

## Table kick and ban

The public lobby has no host, so it uses the same kick vote as the game
page: tap a seat, confirm, Ja / Nein overlay. No Ravi in the waiting
room. Half of the **connected** sitters (`kickVoteYesNeeded`) is enough.
Fewer than three connected cannot open a vote. The Accept window and a
kick vote do not overlap; Accept waits while a vote is open.

On a **yes**, the server reports to the support group (same kick letter
as in-game), removes the seat, and bans that player's sit identity
(`bale:`, `telegram:`, or browser `client:`) on **this room**. Join and
reserved-seat reconnect both refuse with `BANNED`. They can sit a
later public lobby — that is a new room after this one deals.

The same ban list is written by an in-game kick that passes, and by a
hosted-room host kick. AFK and Accept silence do **not** ban;
those people can sit again.

## What stays the same

- Server is the source of truth. The client never starts a game locally.
- `GameEngine` is the only mutator. Who has Accepted, and whether
  the full-table clock is running, is lobby state on the engine (same
  family as `kickVote`: snapshot + timer owned by `SocketHandler`).
- `MIN_PLAYERS` / role mix / night deal do not change.
- Password rooms, group `/create`, share codes, mid-game join still
  forbidden.
- In-game kick vote still freezes game clocks. A yes now also bans that
  identity from this room (reserved reconnect cannot walk back in).

## Implementation map

| Piece | Where |
|---|---|
| Public flag on the room | `RoomOptions` / `Room.summary()` in `shared/` |
| Never assign host; Accept set; full-table window; AFK clock | `shared/src/engine/GameEngine.ts` lobby methods |
| Commands | `shared/src/types/events.ts` + `clientMessages.ts` (`player:wantStart` is Accept; retract stays unused on this table) |
| Ensure-one-lobby on boot and after start | `server/src/rooms/` + `server/src/app.ts` boot (after `restoreLiveRooms`) |
| Empty public room must persist | `SocketHandler` — do not destroy an empty public lobby |
| Pin + always list | `RoomRepository.listPublic` / `listAll`, Join tab, `server/src/bale/commands.ts` |
| Footer hint + Accept modal | `WaitingRoomScreen` — no Start, no share; modal is one Accept action plus a clock |
| Public lobby kick vote | `requestKick` in lobby when `kind: public`; same overlay as the game page |
| Ban on this room | `Room.bannedJoinKeys` — set on vote-yes and host kick; checked at join |
| Copy | `fa.ts` **and** `en.ts` — [`persian.md`](./persian.md) **میز** |
| Flag | `publicTable` in [`flags.ts`](../shared/src/flags.ts), default off |

AFK kick runs even when the public table is dark. The evergreen lobby
itself stays behind `FEATURE_PUBLIC_TABLE`.

## Follow-ups (not v1)

- A second public lobby when the first is full and still in lobby.
- Auto-start when `minPlayers` have Accepted for N seconds with no
  holdouts. Not v1 — the full-table Accept modal is the delay valve.
- Giving hosted rooms the same per-player Accept.
- Kicking a hosted-room host for AFK (would need host migration instead
  of destroy).

## What we will not do

- Several always-on public tables “to give choice.” That re-fragments
  the same small pool.
- Deal as soon as anyone Accepts, ignoring a full table. One impatient
  sitter would deal a 2-player table.
- A Ja / Nein political vote that everyone casts at once when one
  person “calls start.” Filling the table **is** the call; Accept is
  only “I am here.”
- Dealing after the Accept kicks if fewer than `minPlayers` remain.
- Majority of **all seated including disconnected**. Disconnected
  seats do not Accept and are already dropped at deal.
- A public table with a rotating host. Then we inherit host-leave
  destroys-the-room and “waiting for the host.”
