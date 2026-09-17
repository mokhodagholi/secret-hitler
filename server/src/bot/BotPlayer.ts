// Server-side bot player: wraps a BotBrain + GameMemory pair and drives
// the engine by calling engine methods directly (no WebSocket required).
// One BotPlayer per bot seat; the BotManager owns their lifecycle.

import {
  BotBrain,
  GameMemory,
  Phase,
  type GameEngine,
  type GameStateView,
  type Role,
} from '@secret-hitler/shared';

// Bot names shown at the table (فارسی)
const BOT_NAMES = [
  'ربات آلفا',
  'ربات بتا',
  'ربات گاما',
  'ربات دلتا',
  'ربات اپسیلون',
] as const;

export function botName(index: number): string {
  return BOT_NAMES[index % BOT_NAMES.length];
}

/**
 * One AI-controlled seat. After the game starts (`roleAssigned` fires) the
 * brain knows its role. On every `stateChanged` event the bot checks whether
 * it needs to act and schedules a command with a humanlike delay.
 */
export class BotPlayer {
  readonly playerId: string;

  private brain: BotBrain | null = null;
  private readonly memory = new GameMemory();
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(
    playerId: string,
    private readonly engine: GameEngine,
  ) {
    this.playerId = playerId;
  }

  /**
   * Called by BotManager when the engine emits `roleAssigned` for this bot.
   * The role is read directly from the authoritative Room — the bot lives
   * server-side so it has legitimate access.
   */
  onRoleAssigned(): void {
    const player = this.engine.room.players.find(
      (p) => p.id === this.playerId,
    );
    if (!player?.role) return;

    const role = player.role as Role;

    // Build known-fascist set (same visibility rules as the real game)
    const knownFascistIds = new Set<string>();
    if (role === 'fascist') {
      // Fascists know each other and Hitler
      for (const p of this.engine.room.players) {
        if (p.id !== this.playerId && p.role && p.role !== 'liberal') {
          knownFascistIds.add(p.id);
        }
      }
    } else if (role === 'hitler' && this.engine.room.players.length <= 6) {
      // In 5–6 player games Hitler sees fascists
      for (const p of this.engine.room.players) {
        if (p.role === 'fascist') knownFascistIds.add(p.id);
      }
    }

    this.brain = new BotBrain(this.playerId, role, knownFascistIds);
  }

  /**
   * Called by BotManager on every `stateChanged` event. The bot evaluates the
   * current view and schedules an action if it is its turn.
   */
  onStateChanged(): void {
    if (this.disposed || !this.brain) return;

    const room = this.engine.room;
    if (room.phase === Phase.Lobby || room.phase === Phase.GameOver) return;

    // Don't stack pending actions: cancel any previous pending timer first
    this.cancelPending();

    const view = room.viewFor(this.playerId);
    const decision = this.brain.decide(view, this.memory);
    if (!decision) return;

    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null;
      if (this.disposed) return;

      // Re-check that the action is still valid (phase may have changed)
      const currentView = this.engine.room.viewFor(this.playerId);
      if (currentView.phase !== view.phase) return;

      this.engine.handleCommand(this.playerId, decision.command);
    }, decision.delayMs);
  }

  /**
   * Called when a round ends so memory can record what happened.
   * The BotManager feeds this from the `stateChanged` event by diffing
   * the round history.
   */
  onRoundCompleted(view: GameStateView): void {
    if (this.disposed) return;
    const latest = view.roundHistory.at(-1);
    if (!latest) return;

    this.memory.recordRound({
      round: latest.round,
      presidentId: latest.presidentId,
      chancellorId: latest.chancellorId,
      elected: latest.elected,
      votes: new Map(
        (latest.ballots ?? []).map((b) => [b.playerId, b.vote]),
      ),
      enacted: latest.enacted,
      power: latest.power?.kind ?? null,
    });
  }

  dispose(): void {
    this.disposed = true;
    this.cancelPending();
  }

  private cancelPending(): void {
    if (this.pendingTimer != null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
  }
}
