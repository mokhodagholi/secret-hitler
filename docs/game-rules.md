# Game Rules & Round Flow

How a game plays out in this implementation. Reference:
[Secret Hitler (whitesho.com)](https://whitesho.com/SecretHitlerGame).

## Roles

- **Liberals** and **Fascists**, plus **Hitler** (a Fascist with a hidden
  identity). Only liberal and fascist policy types exist — no special
  presidential powers yet.
- Role counts by player count come from the standard distribution
  (`shared/src/engine/roleDistribution.ts`); 3–4 players are supported for dev,
  5–10 for real games.

## A round

1. **Discussion** — the talking stick opens on the President and passes to each
   living player in turn. Only the current speaker may chat (20s per turn,
   `SPEAKING_TURN_MS`); everyone else watches. The stick runs through the
   nomination and voting phases and is cleared during the legislative session.
2. **Nomination** — the President nominates a living player as Chancellor.
3. **Voting** — every living player votes Ja/Nein. A strict majority of Ja
   elects the government.
4. **Legislative session** (only if elected):
   - The President draws **3** policies and **discards 1**.
   - The Chancellor receives the remaining **2** and **enacts 1**.
   - The enacted policy goes on the board; the rest are discarded.
   Hands are private to the active legislator.
5. The presidency passes to the next living player by seat, and a new round
   begins.

## Failed elections

Each failed vote advances the **election tracker**. After **3** consecutive
failures the top policy is enacted automatically (chaos) and the tracker resets.

## Win conditions

- **Liberals** win when **5 liberal** policies are enacted.
- **Fascists** win when **6 fascist** policies are enacted, or when **Hitler is
  elected Chancellor after 3 fascist** policies are on the board.

## Not implemented yet

- Special presidential powers (investigate, peek, special election, execution).
- Veto power, term limits on nomination.
- Hitler-assassination liberal win (no execution power yet).

## Dev notes

- Minimum players to start is env-configurable: `MIN_PLAYERS=3 pnpm dev:server`
  (production keeps the standard 5).
- The server is authoritative; clients send commands and render the broadcast
  `GameStateView`.
