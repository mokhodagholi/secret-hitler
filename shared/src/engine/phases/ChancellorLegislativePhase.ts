import { LEGISLATIVE_PASS_MS, Phase } from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import { type EngineError, err } from '../errors';
import {
  VETO_UNLOCK_FASCIST_POLICIES,
  powerForFascistPolicy,
} from '../../rules/boardPowers';
import type { GamePhase, PhaseHost } from './GamePhase';

/** The Chancellor holds the remaining two policies and enacts one. */
export class ChancellorLegislativePhase implements GamePhase {
  readonly name = Phase.ChancellorLegislative;

  constructor(private readonly host: PhaseHost) {}

  enter(): void {
    this.host.room.vetoRequested = false;
    this.host.openLegislativeTimer(LEGISLATIVE_PASS_MS);
  }

  exit(): void {
    this.host.closeLegislativeTimer();
  }

  handle(playerId: string, command: GameCommand): EngineError | null {
    if (command.kind === 'vetoRequest') return this.requestVeto(playerId);
    if (command.kind === 'vetoConsent') {
      return this.consentVeto(playerId, command.agree);
    }
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
    return this.enactAt(command.index);
  }

  /** No choice in time — the engine enacts a random tile (never on a pending veto). */
  timeout(): void {
    const room = this.host.room;
    if (room.vetoRequested) return;
    const count = room.drawnPolicies.length;
    if (count > 0) this.enactAt(Math.floor(Math.random() * count));
  }

  private enactAt(index: number): EngineError | null {
    const room = this.host.room;
    room.vetoRequested = false;
    const [enacted] = room.drawnPolicies.splice(index, 1);
    room.deck.discardTiles(room.drawnPolicies);
    room.drawnPolicies = [];
    this.host.log(enacted === 'liberal' ? 'liberalEnacted' : 'fascistEnacted');
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

  private requestVeto(playerId: string): EngineError | null {
    const room = this.host.room;
    if (playerId !== room.chancellorId) {
      return err('INVALID_ACTION', 'Only the Chancellor can propose a veto.');
    }
    if (room.fascistPolicies < VETO_UNLOCK_FASCIST_POLICIES) {
      return err('INVALID_ACTION', 'Veto is not available yet.');
    }
    room.vetoRequested = true;
    // The Chancellor has acted — pause the auto-pick while the President decides.
    this.host.closeLegislativeTimer();
    this.host.log('vetoProposed');
    this.host.changed();
    return null;
  }

  private consentVeto(playerId: string, agree: boolean): EngineError | null {
    const room = this.host.room;
    if (playerId !== room.presidentId || !room.vetoRequested) {
      return err('INVALID_ACTION', 'There is no veto to respond to.');
    }
    room.vetoRequested = false;
    if (!agree) {
      // Veto refused — the Chancellor must still enact; give them a fresh window.
      this.host.openLegislativeTimer();
      this.host.log('vetoRejected');
      this.host.changed();
      return null;
    }
    // Veto agreed: both policies discarded, the government fails.
    room.deck.discardTiles(room.drawnPolicies);
    room.drawnPolicies = [];
    this.host.log('vetoAgreed');
    this.host.failElection();
    return null;
  }
}
