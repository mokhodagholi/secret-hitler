import { GameEngine } from '../src/engine/GameEngine';
import { PolicyDeck } from '../src/domain/PolicyDeck';
import { Room } from '../src/domain/Room';
import type { Player, Policy, RoomOptions } from '../src/types/GameState';

/** Deck that serves a fixed tile sequence — no shuffling, fully predictable. */
export class StackedDeck extends PolicyDeck {
  constructor(private readonly tiles: Policy[]) {
    super();
  }

  override reset(): void {
    // Keep the stacked sequence; the engine resets the deck on game start.
  }

  override drawTiles(count: number): Policy[] {
    return this.tiles.splice(0, count);
  }

  override peekTop(count: number): Policy[] {
    return this.tiles.slice(0, count);
  }
}

export function makeRoom(
  options: Partial<RoomOptions> = {},
  deck?: PolicyDeck,
): Room {
  return new Room({
    id: 'room-1',
    code: 'ABC123',
    passwordHash: null,
    deck,
    options: {
      name: 'Test Room',
      hasPassword: false,
      minPlayers: 3,
      maxPlayers: 10,
      timerEnabled: false,
      confirmActions: false,
      ...options,
    },
  });
}

export function seatPlayers(engine: GameEngine, names: string[]): Player[] {
  return names.map((name) => {
    const player = engine.addPlayer(name);
    if ('code' in player) throw new Error(`addPlayer failed: ${player.code}`);
    return player;
  });
}

export interface RunningGame {
  engine: GameEngine;
  room: Room;
  players: Player[];
}

/** Seat `names`, ready everyone, and start the game (first player hosts). */
export function startGame(
  names: string[] = ['Ana', 'Ben', 'Cal'],
  deck?: PolicyDeck,
): RunningGame {
  const room = makeRoom({}, deck);
  const engine = new GameEngine(room);
  const players = seatPlayers(engine, names);
  for (const player of players) engine.setReady(player.id, true);
  const error = engine.startGame(players[0].id);
  if (error) throw new Error(`startGame failed: ${error.code}`);
  return { engine, room, players };
}

/** Nominate `chancellor` and make every living, connected player vote `ja`. */
export function electGovernment(game: RunningGame, chancellor: Player): void {
  const { engine, room } = game;
  const president = room.findPlayer(room.presidentId ?? '');
  if (!president) throw new Error('no president');
  const nominate = engine.handleCommand(president.id, {
    kind: 'nominateChancellor',
    targetId: chancellor.id,
  });
  if (nominate) throw new Error(`nomination failed: ${nominate.code}`);
  for (const player of room.players.filter((p) => p.isAlive && p.connected)) {
    const vote = engine.handleCommand(player.id, { kind: 'castVote', vote: 'ja' });
    if (vote) throw new Error(`vote failed: ${vote.code}`);
  }
}
