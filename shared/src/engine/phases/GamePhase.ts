import type {
  ExecutivePower,
  Faction,
  LogCode,
  Phase,
  Policy,
} from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import type { Room } from '../../domain/Room';
import type { EngineError } from '../errors';

/** Engine services available to phases. Implemented by GameEngine. */
export interface PhaseHost {
  readonly room: Room;
  log(code: LogCode, params?: Record<string, string | number>): void;
  changed(): void;
  transitionTo(phase: Phase): void;
  enactPolicy(policy: Policy): void;
  advanceRound(): void;
  /** A government failed: advance the tracker, enact on chaos, next round. */
  failElection(): void;
  endGame(winner: Faction): void;
  startSpeakingTurnAt(playerId: string | null): void;
  /** Pass the talking stick to the next eligible player (discussion only). */
  advanceSpeaker(): void;
  clearSpeaker(): void;
  /** Open the vote window and schedule its deadline on the server. */
  openVote(): void;
  /** Close the vote window (vote resolved) and cancel its deadline. */
  closeVote(): void;
  /** Open the legislative choice window and schedule its deadline. */
  openLegislativeTimer(): void;
  /** Close the legislative choice window and cancel its deadline. */
  closeLegislativeTimer(): void;
  /** Enter the SpecialPower phase with the President's pending power. */
  grantPower(power: ExecutivePower): void;
  /** Special election: hand the presidency to `playerId` for the next round. */
  startSpecialElection(playerId: string): void;
}

/**
 * One state of the game's state machine. The engine holds the current phase
 * and delegates every in-game command to it; `enter`/`exit` run on transition.
 */
export interface GamePhase {
  readonly name: Phase;
  enter?(): void;
  exit?(): void;
  handle(playerId: string, command: GameCommand): EngineError | null;
  /** A player connected or disconnected — re-evaluate phase conditions. */
  presenceChanged?(): void;
  /** A scheduled phase deadline elapsed (e.g. the vote window closed). */
  timeout?(): void;
}
