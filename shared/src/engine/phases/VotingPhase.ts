import { Phase, type Player } from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import { type EngineError, err } from '../errors';
import type { GamePhase, PhaseHost } from './GamePhase';

/** Everyone votes Ja/Nein on the proposed government. */
export class VotingPhase implements GamePhase {
  readonly name = Phase.Voting;

  constructor(private readonly host: PhaseHost) {}

  /** Open a fresh vote: no talking stick, a countdown runs server-side. */
  enter(): void {
    this.host.room.votes.clear();
    this.host.clearSpeaker();
    this.host.openVote();
  }

  exit(): void {
    this.host.closeVote();
  }

  handle(playerId: string, command: GameCommand): EngineError | null {
    if (command.kind !== 'castVote') {
      return err('INVALID_ACTION', 'A vote is in progress.');
    }
    const room = this.host.room;
    const player = room.findPlayer(playerId);
    if (!player?.isAlive) {
      return err('INVALID_ACTION', 'You cannot vote in this election.');
    }

    room.votes.set(playerId, command.vote);
    if (!this.resolveIfComplete()) this.host.changed();
    return null;
  }

  /** A disconnect can shrink the electorate enough to finish the election. */
  presenceChanged(): void {
    this.resolveIfComplete();
  }

  /** Vote window closed — anyone who didn't vote is counted as Nein. */
  timeout(): void {
    if (this.host.room.phase !== Phase.Voting) return;
    this.resolveElection(this.voters());
  }

  /** Living, connected players — the current electorate. */
  private voters(): Player[] {
    return this.host.room.players.filter((p) => p.isAlive && p.connected);
  }

  private resolveIfComplete(): boolean {
    const voters = this.voters();
    const complete =
      voters.length > 0 && voters.every((p) => this.host.room.votes.has(p.id));
    if (complete) this.resolveElection(voters);
    return complete;
  }

  private resolveElection(voters: Player[]): void {
    const room = this.host.room;
    const ja = voters.filter((p) => room.votes.get(p.id) === 'ja').length;
    const elected = ja * 2 > voters.length;
    const chancellor = room.findPlayer(room.chancellorId ?? '');
    this.host.log(elected ? 'votePassed' : 'voteFailed', {
      ja,
      total: voters.length,
    });

    if (elected && chancellor) {
      room.electionTracker = 0;
      if (room.fascistPolicies >= 3 && chancellor.role === 'hitler') {
        this.host.log('hitlerChancellor', { name: chancellor.name });
        this.host.endGame('fascist');
        return;
      }
      // This government is term-limited from the next nomination.
      room.lastElectedPresidentId = room.presidentId;
      room.lastElectedChancellorId = chancellor.id;
      this.host.log('governmentElected', { name: chancellor.name });
      this.host.transitionTo(Phase.PresidentLegislative);
    } else {
      this.host.failElection();
    }
  }
}
