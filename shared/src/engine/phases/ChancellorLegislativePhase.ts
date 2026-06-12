import { Phase } from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import { type EngineError, err } from '../errors';
import { powerForFascistPolicy } from '../../rules/boardPowers';
import type { GamePhase, PhaseHost } from './GamePhase';

/** The Chancellor holds the remaining two policies and enacts one. */
export class ChancellorLegislativePhase implements GamePhase {
  readonly name = Phase.ChancellorLegislative;

  constructor(private readonly host: PhaseHost) {}

  handle(playerId: string, command: GameCommand): EngineError | null {
    if (command.kind !== 'enactPolicy') {
      return err('INVALID_ACTION', 'The Chancellor is choosing a policy to enact.');
    }
    const room = this.host.room;
    if (playerId !== room.chancellorId) {
      return err('INVALID_ACTION', 'You are not enacting a policy.');
    }
    if (command.index < 0 || command.index >= room.drawnPolicies.length) {
      return err('INVALID_ACTION', 'Invalid policy choice.');
    }

    const [enacted] = room.drawnPolicies.splice(command.index, 1);
    room.deck.discardTiles(room.drawnPolicies);
    room.drawnPolicies = [];
    this.host.log(`A ${enacted} policy is enacted.`);
    this.host.enactPolicy(enacted);
    if (room.phase === Phase.GameOver) return null;

    // A fascist policy may grant the President an executive power.
    const power =
      enacted === 'fascist'
        ? powerForFascistPolicy(room.players.length, room.fascistPolicies)
        : null;
    if (power) this.host.grantPower(power);
    else this.host.advanceRound();
    return null;
  }
}
