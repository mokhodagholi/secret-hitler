import { LEGISLATIVE_DEAL_MS, Phase } from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import { type EngineError, err } from '../errors';
import type { GamePhase, PhaseHost } from './GamePhase';

/** The President holds three drawn policies and discards one. */
export class PresidentLegislativePhase implements GamePhase {
  readonly name = Phase.PresidentLegislative;

  constructor(private readonly host: PhaseHost) {}

  /** Deal three policies to the President for the legislative session. */
  enter(): void {
    const room = this.host.room;
    room.drawnPolicies = room.deck.drawTiles(3);
    this.host.openLegislativeTimer(LEGISLATIVE_DEAL_MS);
    this.host.log('presidentDraws');
    this.host.changed();
  }

  exit(): void {
    this.host.closeLegislativeTimer();
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
    return this.discardAt(command.index);
  }

  /** No choice in time — the engine discards a random tile. */
  timeout(): void {
    const count = this.host.room.drawnPolicies.length;
    if (count > 0) this.discardAt(Math.floor(Math.random() * count));
  }

  private discardAt(index: number): EngineError | null {
    const room = this.host.room;
    const [discarded] = room.drawnPolicies.splice(index, 1);
    room.deck.discardTiles([discarded]);
    this.host.transitionTo(Phase.ChancellorLegislative);
    this.host.log('presidentPasses');
    this.host.changed();
    return null;
  }
}
