import {
  INVESTIGATION_HOLD_MS,
  Phase,
  SPECIAL_POWER_DURATION_MS,
  partyOf,
  type Player,
} from '../../types/GameState';
import { POWER_PROMPT_MS, ceremonyDelay } from '../../ravi/clipMs';
import type { GameCommand } from '../../types/events';
import { type EngineError, err } from '../errors';
import type { GamePhase, PhaseHost } from './GamePhase';

/** The President uses the executive power granted by the last fascist policy. */
export class SpecialPowerPhase implements GamePhase {
  readonly name = Phase.SpecialPower;

  constructor(private readonly host: PhaseHost) {}

  enter(): void {
    this.host.openSpecialPowerTimer(
      SPECIAL_POWER_DURATION_MS,
      ceremonyDelay(this.host.room.options.skipCeremony, POWER_PROMPT_MS),
    );
  }

  exit(): void {
    this.host.closeSpecialPowerTimer();
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
        this.host.recordHistoryPower('policyPeek');
        this.host.scheduleAdvanceRound();
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

  /** Choose-window elapsed, or the investigate reveal hold finished. */
  timeout(): void {
    const room = this.host.room;
    if (room.activePower === 'investigate' && room.investigation) {
      this.host.scheduleAdvanceRound();
      return;
    }
    const presidentId = room.presidentId;
    if (!presidentId) {
      this.host.scheduleAdvanceRound();
      return;
    }
    switch (room.activePower) {
      case 'policyPeek':
        this.host.recordHistoryPower('policyPeek');
        this.host.scheduleAdvanceRound();
        return;
      case 'investigate': {
        const target = this.randomInvestigateTarget(presidentId);
        if (!target) {
          this.host.scheduleAdvanceRound();
          return;
        }
        this.investigate(presidentId, target.id);
        return;
      }
      case 'execution': {
        const target = this.randomLivingTarget(presidentId);
        if (!target) {
          this.host.scheduleAdvanceRound();
          return;
        }
        this.execute(presidentId, target.id);
        return;
      }
      case 'specialElection': {
        const target = this.randomConnectedTarget(presidentId);
        if (!target) {
          this.host.scheduleAdvanceRound();
          return;
        }
        this.specialElection(presidentId, target.id);
        return;
      }
      default:
        this.host.scheduleAdvanceRound();
    }
  }

  private investigate(playerId: string, targetId: string): EngineError | null {
    const room = this.host.room;
    // Two steps: first pick the target, then acknowledge the revealed result.
    if (room.investigation) {
      this.host.scheduleAdvanceRound();
      return null;
    }
    const target = this.livingTarget(playerId, targetId);
    if (!target) return err('INVALID_ACTION', 'That player cannot be investigated.');
    if (room.investigatedIds.includes(target.id)) {
      return err('INVALID_ACTION', 'That player has already been investigated.');
    }
    const party = partyOf(target.role);
    if (!party) return err('INVALID_ACTION', 'That player cannot be investigated.');
    room.investigatedIds.push(target.id);
    room.investigation = { targetId: target.id, party };
    room.investigations.push({
      investigatorId: playerId,
      targetId: target.id,
      party,
    });
    this.host.recordHistoryPower('investigate', target.id);
    this.host.openSpecialPowerTimer(INVESTIGATION_HOLD_MS);
    this.host.changed();
    // Log after the private snapshot so the President overlay already has the party.
    this.host.log('investigated', { name: target.name });
    return null;
  }

  private execute(playerId: string, targetId: string): EngineError | null {
    const target = this.livingTarget(playerId, targetId);
    if (!target) return err('INVALID_ACTION', 'That player cannot be executed.');
    target.isAlive = false;
    this.host.recordHistoryPower('execution', target.id);
    this.host.log('executed', { name: target.name });
    if (target.role === 'hitler') {
      this.host.log('hitlerExecuted');
      this.host.endGame('liberal');
      return null;
    }
    this.host.scheduleAdvanceRound();
    return null;
  }

  private specialElection(playerId: string, targetId: string): EngineError | null {
    const target = this.livingTarget(playerId, targetId);
    if (!target?.connected) {
      return err('INVALID_ACTION', 'That player cannot be chosen.');
    }
    this.host.scheduleSpecialElection(target.id);
    return null;
  }

  /** A living player who isn't the President themselves. */
  private livingTarget(playerId: string, targetId: string): Player | null {
    const target = this.host.room.findPlayer(targetId);
    if (!target || !target.isAlive || target.id === playerId) return null;
    return target;
  }

  private randomLivingTarget(presidentId: string): Player | null {
    const choices = this.host.room.players.filter(
      (player) => player.isAlive && player.id !== presidentId,
    );
    if (choices.length === 0) return null;
    return choices[Math.floor(Math.random() * choices.length)] ?? null;
  }

  private randomInvestigateTarget(presidentId: string): Player | null {
    const choices = this.host.room.players.filter(
      (player) =>
        player.isAlive &&
        player.id !== presidentId &&
        !this.host.room.investigatedIds.includes(player.id),
    );
    if (choices.length === 0) return null;
    return choices[Math.floor(Math.random() * choices.length)] ?? null;
  }

  private randomConnectedTarget(presidentId: string): Player | null {
    const choices = this.host.room.players.filter(
      (player) => player.isAlive && player.connected && player.id !== presidentId,
    );
    if (choices.length === 0) return null;
    return choices[Math.floor(Math.random() * choices.length)] ?? null;
  }
}
