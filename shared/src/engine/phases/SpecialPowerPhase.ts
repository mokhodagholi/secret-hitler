import { Phase, type Faction, type Player } from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import { type EngineError, err } from '../errors';
import type { GamePhase, PhaseHost } from './GamePhase';

/** The President uses the executive power granted by the last fascist policy. */
export class SpecialPowerPhase implements GamePhase {
  readonly name = Phase.SpecialPower;

  constructor(private readonly host: PhaseHost) {}

  exit(): void {
    const room = this.host.room;
    room.activePower = null;
    room.peekedPolicies = [];
    room.investigation = null;
  }

  handle(playerId: string, command: GameCommand): EngineError | null {
    if (command.kind !== 'useSpecialPower') {
      return err('INVALID_ACTION', 'The President is using a power.');
    }
    const room = this.host.room;
    if (playerId !== room.presidentId) {
      return err('INVALID_ACTION', 'Only the President can use this power.');
    }

    switch (room.activePower) {
      case 'policyPeek':
        // The President has seen the top three; acknowledge and continue.
        this.host.advanceRound();
        return null;
      case 'investigate':
        return this.investigate(playerId, command.targetId);
      case 'execution':
        return this.execute(playerId, command.targetId);
      case 'specialElection':
        return this.specialElection(playerId, command.targetId);
      default:
        return err('INVALID_ACTION', 'No power is active.');
    }
  }

  private investigate(playerId: string, targetId: string): EngineError | null {
    const room = this.host.room;
    // Two steps: first pick the target, then acknowledge the revealed result.
    if (room.investigation) {
      this.host.advanceRound();
      return null;
    }
    const target = this.livingTarget(playerId, targetId);
    if (!target) return err('INVALID_ACTION', 'That player cannot be investigated.');
    if (room.investigatedIds.includes(target.id)) {
      return err('INVALID_ACTION', 'That player has already been investigated.');
    }
    room.investigatedIds.push(target.id);
    room.investigation = { targetId: target.id, party: partyOf(target) };
    this.host.log('investigated', { name: target.name });
    this.host.changed();
    return null;
  }

  private execute(playerId: string, targetId: string): EngineError | null {
    const target = this.livingTarget(playerId, targetId);
    if (!target) return err('INVALID_ACTION', 'That player cannot be executed.');
    target.isAlive = false;
    this.host.log('executed', { name: target.name });
    if (target.role === 'hitler') {
      this.host.log('hitlerExecuted');
      this.host.endGame('liberal');
      return null;
    }
    this.host.advanceRound();
    return null;
  }

  private specialElection(playerId: string, targetId: string): EngineError | null {
    const target = this.livingTarget(playerId, targetId);
    if (!target?.connected) {
      return err('INVALID_ACTION', 'That player cannot be chosen.');
    }
    this.host.startSpecialElection(target.id);
    return null;
  }

  /** A living player who isn't the President themselves. */
  private livingTarget(playerId: string, targetId: string): Player | null {
    const target = this.host.room.findPlayer(targetId);
    if (!target || !target.isAlive || target.id === playerId) return null;
    return target;
  }
}

/** The party an Investigate reveals — Hitler's membership card reads Fascist. */
function partyOf(player: Player): Faction {
  return player.role === 'liberal' ? 'liberal' : 'fascist';
}
