import type { Phase, Policy } from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import type { Room } from '../../domain/Room';
import type { EngineError } from '../errors';

/** Engine services available to phases. Implemented by GameEngine. */
export interface PhaseHost {
  readonly room: Room;
  log(text: string): void;
  changed(): void;
  transitionTo(phase: Phase): void;
  enactPolicy(policy: Policy): void;
  advanceRound(): void;
  endGame(): void;
  startSpeakingTurnAt(playerId: string | null): void;
  clearSpeaker(): void;
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
}
