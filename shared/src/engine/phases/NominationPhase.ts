import { Phase } from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import { type EngineError, err } from '../errors';
import type { GamePhase, PhaseHost } from './GamePhase';

/** The President picks a Chancellor candidate, then voting begins. */
export class NominationPhase implements GamePhase {
  readonly name = Phase.Nomination;

  constructor(private readonly host: PhaseHost) {}

  /** A fresh round: discussion (talking stick) opens on the President. */
  enter(): void {
    const room = this.host.room;
    room.chancellorId = null;
    room.votes.clear();
    this.host.startSpeakingTurnAt(room.presidentId);
  }

  handle(playerId: string, command: GameCommand): EngineError | null {
    const room = this.host.room;
    // The current speaker may end their discussion turn early.
    if (command.kind === 'endTurn') {
      if (playerId !== room.speakerId) {
        return err('INVALID_ACTION', 'It is not your turn to speak.');
      }
      this.host.advanceSpeaker();
      return null;
    }
    if (command.kind !== 'nominateChancellor') {
      return err('INVALID_ACTION', 'Only a nomination is expected right now.');
    }
    if (playerId !== room.presidentId) {
      return err('INVALID_ACTION', 'Only the President can nominate.');
    }
    const target = room.findPlayer(command.targetId);
    if (!target || !target.isAlive || target.id === playerId) {
      return err('INVALID_ACTION', 'That player cannot be nominated.');
    }
    if (room.ineligibleChancellorIds().includes(target.id)) {
      return err('INVALID_ACTION', 'That player is term-limited this round.');
    }

    room.chancellorId = target.id;
    this.host.transitionTo(Phase.Voting);
    this.host.log('nominated', {
      president: room.findPlayer(playerId)?.name ?? '',
      chancellor: target.name,
    });
    this.host.changed();
    return null;
  }
}
