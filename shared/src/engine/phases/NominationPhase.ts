import { Phase } from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import { type EngineError, err } from '../errors';
import type { GamePhase, PhaseHost } from './GamePhase';

/** The President picks a Chancellor candidate, then voting begins. */
export class NominationPhase implements GamePhase {
  readonly name = Phase.Nomination;

  constructor(private readonly host: PhaseHost) {}

  /** A fresh round: open discussion first, then the nomination window. */
  enter(): void {
    const room = this.host.room;
    room.chancellorId = null;
    room.votes.clear();
    this.host.openDiscussion();
  }

  exit(): void {
    this.host.closeDiscussion();
    this.host.closeNominationTimer();
  }

  /** No nomination in time: the election fails and the presidency passes on. */
  timeout(): void {
    this.host.failElection();
  }

  handle(playerId: string, command: GameCommand): EngineError | null {
    const room = this.host.room;
    const discussing = room.discussionEndsAt > 0;
    if (command.kind === 'endTurn') {
      // Only the President drives the round on: during discussion endTurn opens
      // nomination early; once nominating it fails the election.
      if (playerId !== room.presidentId) {
        return err(
          'INVALID_ACTION',
          discussing
            ? 'Only the President can start the nomination.'
            : 'Only the President can end the round.',
        );
      }
      if (discussing && this.host.inOpeningNight()) {
        return err('INVALID_ACTION', 'Wait until night is over.');
      }
      if (discussing) this.host.endDiscussion();
      else this.host.failElection();
      return null;
    }
    if (command.kind !== 'nominateChancellor') {
      return err('INVALID_ACTION', 'Only a nomination is expected right now.');
    }
    if (playerId !== room.presidentId) {
      return err('INVALID_ACTION', 'Only the President can nominate.');
    }
    const target = room.findPlayer(command.targetId);
    if (!target || !target.isAlive || !target.connected || target.id === playerId) {
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
      presidentId: playerId,
      chancellorId: target.id,
    });
    this.host.changed();
    return null;
  }
}
