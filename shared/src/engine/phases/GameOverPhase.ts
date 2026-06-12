import { Phase } from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import { type EngineError, err } from '../errors';
import type { GamePhase, PhaseHost } from './GamePhase';

/** Terminal state — all roles are revealed, no commands are accepted. */
export class GameOverPhase implements GamePhase {
  readonly name = Phase.GameOver;

  constructor(private readonly host: PhaseHost) {}

  enter(): void {
    this.host.clearSpeaker();
  }

  handle(_playerId: string, _command: GameCommand): EngineError | null {
    return err('INVALID_ACTION', 'The game is over.');
  }
}
