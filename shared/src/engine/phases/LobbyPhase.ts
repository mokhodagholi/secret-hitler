import { Phase } from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import { type EngineError, err } from '../errors';
import type { GamePhase } from './GamePhase';

/** Pre-game state. Lobby flow (join/ready/start) lives on the engine itself. */
export class LobbyPhase implements GamePhase {
  readonly name = Phase.Lobby;

  handle(_playerId: string, _command: GameCommand): EngineError | null {
    return err('INVALID_ACTION', 'The game has not started yet.');
  }
}
