import type { Faction, GameEngine, Player, Room } from '@secret-hitler/shared';
import type { GameHistoryStore, GameRecord } from './GameHistoryStore';

/**
 * Persists each finished game. Subscribes to the engine's `gameOver` event and
 * writes a {@link GameRecord} through the {@link GameHistoryStore}. Persistence
 * failures are logged, never thrown — a dead database must not crash a game.
 */
export class GameResultRecorder {
  constructor(private readonly store: GameHistoryStore) {}

  /** Subscribe to a room's engine. Call once per room, at creation. */
  attach(entry: { engine: GameEngine; room: Room }): void {
    entry.engine.on('gameOver', ({ room }) => {
      void this.save(room);
    });
  }

  private async save(room: Room): Promise<void> {
    if (!room.winner) return;
    try {
      await this.store.saveGame(toRecord(room, room.winner));
    } catch (error) {
      console.error(`Failed to persist game ${room.code}`, error);
    }
  }
}

function toRecord(room: Room, winner: Faction): GameRecord {
  return {
    roomCode: room.code,
    roomName: room.options.name,
    winner,
    playerCount: room.players.length,
    liberalPolicies: room.liberalPolicies,
    fascistPolicies: room.fascistPolicies,
    players: room.players
      .filter((player): player is Player & { role: NonNullable<Player['role']> } =>
        player.role != null,
      )
      .map((player) => ({
        name: player.name,
        role: player.role,
        seat: player.seat,
        won: factionOf(player.role) === winner,
      })),
  };
}

/** Hitler sides with the Fascists; everyone else maps to their own faction. */
function factionOf(role: NonNullable<Player['role']>): Faction {
  return role === 'liberal' ? 'liberal' : 'fascist';
}
