import { Phase } from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import { type EngineError, err } from '../errors';
import type { GamePhase, PhaseHost } from './GamePhase';

/** The President holds three drawn policies and discards one. */
export class PresidentLegislativePhase implements GamePhase {
  readonly name = Phase.PresidentLegislative;

  constructor(private readonly host: PhaseHost) {}

  /** Deal three policies to the President; chat closes during the session. */
  enter(): void {
    const room = this.host.room;
    room.drawnPolicies = room.deck.drawTiles(3);
    this.host.clearSpeaker();
    this.host.log('The President draws three policies.');
    this.host.changed();
  }

  handle(playerId: string, command: GameCommand): EngineError | null {
    if (command.kind !== 'discardPolicy') {
      return err('INVALID_ACTION', 'The President is choosing a policy to discard.');
    }
    const room = this.host.room;
    if (playerId !== room.presidentId) {
      return err('INVALID_ACTION', 'You are not discarding a policy.');
    }
    if (command.index < 0 || command.index >= room.drawnPolicies.length) {
      return err('INVALID_ACTION', 'Invalid policy choice.');
    }

    const [discarded] = room.drawnPolicies.splice(command.index, 1);
    room.deck.discardTiles([discarded]);
    this.host.transitionTo(Phase.ChancellorLegislative);
    this.host.log('The President passes two policies to the Chancellor.');
    this.host.changed();
    return null;
  }
}
