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
| Every sitter has a **Start** button, separate from Ready | Yes, on **this** table only. |
| Hint that start needs at least half the table | Yes — always visible, not a one-shot tutorial. |
| When half have tapped Start, the rest must choose | Yes. Silence is a kick, then deal if a legal table remains. |
| 5-minute lobby AFK kick on **every** room | Yes, with the host exception below. |
| Vote to remove someone in the public lobby, same as in-game | Yes. Half yes → kick, report, and ban from **that** room. |

The diagnosis is right. Start is not a host gavel and not a second ready
toggle. The locked chrome and the half → must-choose rule are below.

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
  → sit, tap Ready (I will play)
  → tap Start (I want to deal now) — a different control
  → footer shows how many have tapped Start vs half of the table
  → when half have tapped Start, everyone who has not gets a modal
  → they must tap Start; if they do not, they are kicked
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

Hosted rooms keep today's host button, host kick, and host-leave
destroys-the-room behaviour.

### Start, not Ready

Sitting is the seat. Hosted rooms keep Ready (the host waits, then deals).
The public table does not: one **Start** button.

| Control | Means | Who |
|---|---|---|
| **Start** | Deal **now**. | Every connected sitter. |

Tapping Start does not need a Ready first. Before the must-choose modal
opens, they may take Start back (count drops). After the modal opens,
yes is locked.

That same seat cannot tap Start again for **3 minutes**
(`WANT_START_COOLDOWN_MS`). Retract does not reset the clock. The
must-choose modal skips the cooldown so a holdout can still answer.
This stops one impatient person from hammering Start.

Seats show who has already tapped Start — a brass glow, not a ready
blot.

### Hint — half the table

The Start control always carries a short hint, even at 1/10. Not a
one-shot dialog they will dismiss and forget.

Meaning (write real **میز** lines in `fa.ts` / `en.ts` at implement
time, not these English glosses):

- Idle: you need at least half the people at the table to tap Start.
- Progress: `{have} از {need}` — how many have tapped, how many are
  `ceil(connected / 2)`.
- Cooldown: you can tap Start again in N minutes / seconds.

No Wikipedia paragraph. One line under the buttons is enough. A first
tap on a disabled Start can open a small confirm with the same sentence
if the footer feels easy to miss — same copy, not a second explanation.

### Half have tapped Start → the rest must choose

`needed = ceil(connected / 2)`, same idea as `kickVoteYesNeeded`.
Disconnected seats do not count.

Two phases:

1. **Collecting.** People tap Start on their own. No modal. The
   footer is the only chrome.
2. **Must-choose.** The moment `startCount >= needed`, every connected
   player who has **not** tapped Start gets a modal they cannot ignore.
   One action: Start. Clock **20 s**. There is no Nein on this modal —
   staying and refusing is what the kick is for. Leave is still Leave.

If they tap Start in time, they stay. If the clock hits and they have
  not tapped Start, they are
kicked with the away / did-not-start reason. They can join the public
table again.

People who already tapped Start do **not** get that modal. They see
the table waiting on the holdouts.

Then the engine looks at who is left:

- Remaining connected `>= minPlayers` (5) → `startGame` on those seats.
- Remaining connected `< minPlayers` → **do not deal**. The people who
  already said Start stay seated. The ones who did not choose are gone.
  Collecting begins again from the current Start taps.

That is the hole from “half agreed, kick the rest, always deal.” Six
sit, three tap Start, three ignore the modal, three remain — the game
cannot start. Kicking the holdouts is still right (they blocked the
table). The three who wanted to play wait for two more. Do not pretend
a 3-player Secret Hitler began.

Do **not** add this Start button to hosted rooms. A private table
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

Idle means: hosted room, Ready is off; public table, Start has not
been tapped.

| | Rule |
|---|---|
| Clock starts | On sit, or when they flip ready → unready (hosted), or retract Start (public). |
| Clock resets | Hosted: Ready. Public: Start. Disconnect clears the clock. |
| Pauses | While the must-choose Start modal is open, and while a kick vote is open. |
| Message | `room:closed` with a dedicated reason (not `KICKED` / `HOST_LEFT`). Client copy: they were away; they can join again. |
| Who | Every non-host seat, every lobby. On the public table there is no host, so every seat. |

**Do not kick the host of a hosted room for this.** Host leave still
destroys that room. A host waiting for friends from a group chat is
the intended use of Create. Kicking them after five minutes of unreadiness
would delete the table they just opened.

Disconnected lobby seats are already dropped at start
(`startGame` keeps only `connected`). This AFK rule is for people who
are online and idle.

Five minutes is long enough to take a call and short enough that a
corpse seat does not sit on a 4/5 table for an hour.

## Table kick and ban

The public lobby has no host, so it uses the same kick vote as the game
page: tap a seat, confirm, Ja / Nein overlay. No Ravi in the waiting
room. Half of the **connected** sitters (`kickVoteYesNeeded`) is enough.
Fewer than three connected cannot open a vote. Must-choose Start and a
kick vote do not overlap; Start taps wait while a vote is open.

On a **yes**, the server reports to the support group (same kick letter
as in-game), removes the seat, and bans that player's sit identity
(`bale:`, `telegram:`, or browser `client:`) on **this room**. Join and
reserved-seat reconnect both refuse with `BANNED`. They can sit a
later public lobby — that is a new room after this one deals.

The same ban list is written by an in-game kick that passes, and by a
hosted-room host kick. AFK and must-choose silence do **not** ban;
those people can sit again.

## What stays the same

- Server is the source of truth. The client never starts a game locally.
- `GameEngine` is the only mutator. Who has tapped Start, and whether
  the must-choose clock is running, is lobby state on the engine (same
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
| Never assign host; want-start set; must-choose; AFK clock | `shared/src/engine/GameEngine.ts` lobby methods |
| Commands | `shared/src/types/events.ts` + `clientMessages.ts` (`player:wantStart` / retract, must-choose is the same want) |
| Ensure-one-lobby on boot and after start | `server/src/rooms/` + `server/src/app.ts` boot (after `restoreLiveRooms`) |
| Empty public room must persist | `SocketHandler` — do not destroy an empty public lobby |
| Pin + always list | `RoomRepository.listPublic` / `listAll`, Join tab, `server/src/bale/commands.ts` |
| Footer + hint + must-choose modal | `WaitingRoomScreen` — Start only; modal is one Start action plus a clock |
| Public lobby kick vote | `requestKick` in lobby when `kind: public`; same overlay as the game page |
| Ban on this room | `Room.bannedJoinKeys` — set on vote-yes and host kick; checked at join |
| Copy | `fa.ts` **and** `en.ts` — [`persian.md`](./persian.md) **میز** |
| Flag | `publicTable` in [`flags.ts`](../shared/src/flags.ts), default off |

AFK kick runs even when the public table is dark. The evergreen lobby
itself stays behind `FEATURE_PUBLIC_TABLE`.

## Follow-ups (not v1)

- A second public lobby when the first is full and still in lobby.
- Auto-start when `minPlayers` have tapped Start for N seconds with no
  holdouts. Not v1 — the must-choose modal is the delay valve.
- Giving hosted rooms the same per-player Start.
- Kicking a hosted-room host for AFK (would need host migration instead
  of destroy).

## What we will not do

- Several always-on public tables “to give choice.” That re-fragments
  the same small pool.
- Start as soon as anyone taps Start, ignoring ready and ignoring half.
  The ready toggle would become a lie, and one impatient sitter would
  deal a 2-player table.
- A Ja / Nein political vote that everyone casts at once when one
  person “calls start.” Start **is** the vote; the modal is only for
  people who have not tapped it yet.
- Dealing after the must-choose kicks if fewer than `minPlayers` remain.
- Majority of **all seated including disconnected**. Disconnected
  seats do not tap Start and are already dropped at deal.
- A public table with a rotating host. Then we inherit host-leave
  destroys-the-room and “waiting for the host.”
