# Security — rate limits and bans

How the server slows abuse, and the two bans that are not the same thing.
This is the product rule. It is not a full audit of the host.

Code: [`server/src/http/routes.ts`](../server/src/http/routes.ts),
[`server/src/rooms/HostedRoomQuota.ts`](../server/src/rooms/HostedRoomQuota.ts),
[`server/src/http/firewallBan.ts`](../server/src/http/firewallBan.ts),
[`server/src/index.ts`](../server/src/index.ts).

## Two bans

| Ban | Who | How long | Where it is stored |
|---|---|---|---|
| Spam address | The address that opened tables too fast, and only when that caller is not signed in through Bale or Telegram | 2 hours, then it ends by itself | `create_bans`, plus a firewall drop |
| Table kick | That seat's account, on **that room only** | Until the room is gone | `bannedJoinKeys` on the room |

A rate limit is neither. It answers "slow down" and then lets them continue.

## Rate limits

Each budget is one address, one minute. Hitting it returns `429` /
`RATE_LIMITED`. Nobody is banned.

| Call | Budget |
|---|---|
| `POST /api/rooms` | 5 |
| `POST /api/rooms/:idOrCode/join` | 10 |
| `PUT /api/profile` and `POST /api/history/mine` | 20 |
| `POST /api/support` | 3 |

A group `/create` is separate: 3 creates a minute for that group chat.
The bot tells the chat to wait. It does not ban the group.

Support letters are only slowed. They are not tied to the room ban.

## Opening tables

[`HostedRoomQuota`](../server/src/rooms/HostedRoomQuota.ts) counts hosted
creates from one address inside **10 minutes**.

| What they did | Result |
|---|---|
| First open table | Kept |
| A second table while the first is still open | The extra room is removed. `409` / `ALREADY_HOSTING`. No ban |
| A third create in those 10 minutes, and the caller is not a Bale or Telegram login | That address is banned. `403` / `BANNED` |
| A Bale or Telegram account opens a second table | Refused, same as above. The account is not banned |
| A Bale or Telegram account on an address that was just banned | They can still sit. The ban was someone else's browser |

The third create is what gets banned, not "they already had a table". A
real player who mis-taps a second room must not be locked out. Anonymous
browser creates are the spam path: a new `client:` id each time, same
address, rooms left open.

The ban lasts **2 hours** (`BAN_DURATION_MS`). After that the address can
open a table again. If they burst a third time, the two hours start over.

`create_bans` keeps the row across a restart (`banned_at`). On boot, a row
older than two hours is deleted. While the process is up, a sweep every
minute drops whatever has expired.

## Firewall

An IP ban is also a packet drop, or the banned address could keep calling
the process.

[`firewallBan`](../server/src/http/firewallBan.ts) inserts a `DROP` on
`INPUT` and `DOCKER-USER`, comment `secret-hitler-spam`, and appends the
address to `/etc/secret-hitler/banned-ips`. Loopback and private addresses
are skipped, so tests and the Docker bridge are not banned.

The direct public peer is the address that is banned. When that peer is
the proxy, the forwarded address is used instead.

When the two hours end, [`firewallUnban`](../server/src/http/firewallBan.ts)
deletes those rules and removes the line from the file. The boot script
re-reads that file, so leaving the line would lock the address out again
after a reboot.

A rule added by hand, not through `create_bans`, is not on this clock. It
stays until someone removes it.

## Table kick

This is the "ban this player" at one table. It is not the spam ban.

When a kick lands, [`banFromTable`](../shared/src/engine/GameEngine.ts)
stores that seat's `joinKey` (`bale:`, `telegram:`, or `client:`) on the
room. Join and the public salon refuse that key with `BANNED` until the
room is gone. Other rooms are not affected. Other people on the same
address are not affected.

Lobby kick and in-game kick only run when `lobbyKick` / `gameKick` are on.
Both default off. See [`feature-flags.md`](./feature-flags.md).

## What else is closed

- The website does not seat anyone unless `FEATURE_BROWSER_PLAY` is on.
  Bale and Telegram still share tables. See [`feature-flags.md`](./feature-flags.md).
- Finished games are not a public list. `POST /api/history/mine` returns
  only the caller's tables.
- Bot webhooks check the webhook secret when one is set. Admin bot
  commands answer only admin user ids.
