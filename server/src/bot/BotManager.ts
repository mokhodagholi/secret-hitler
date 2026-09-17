// Owns the lifecycle of all bot seats across all rooms.
// One BotManager lives as a singleton inside the server; it hooks into
// every GameEngine that has bots and drives them through events.

import { Phase, type GameEngine, type FeatureFlags } from '@secret-hitler/shared';
import type { RoomEntry } from '../rooms/RoomRepository';
import { BotPlayer, botName } from './BotPlayer';

// How many avatars exist — same count the client renders
const BOT_AVATAR_START = 20; // offset so bots look distinct

/**
 * Manages AI bot seats: adds them to rooms, subscribes to engine events,
 * and tears them down when the room closes.
 */
export class BotManager {
  /** roomId → list of bot players in that room */
  private readonly roomBots = new Map<string, BotPlayer[]>();
  /** roomId → cleanup function (unsubscribes engine listeners) */
  private readonly cleanups = new Map<string, () => void>();

  /**
   * Fill empty seats in `entry` with bots up to `minPlayers`.
   * No-ops if bots are already present or the room is not in lobby phase.
   * Returns the number of bots added.
   */
  fillRoom(entry: RoomEntry, minPlayers: number): number {
    const { room, engine } = entry;
    if (room.phase !== Phase.Lobby) return 0;

    const existing = this.roomBots.get(room.id) ?? [];
    const currentCount = room.players.length;
    const needed = Math.max(0, minPlayers - currentCount);

    if (needed === 0) return 0;

    const bots: BotPlayer[] = [...existing];

    for (let index = 0; index < needed; index++) {
      const name = botName(existing.length + index);
      const avatar = (BOT_AVATAR_START + existing.length + index) % 30;

      const playerOrError = engine.addPlayer(name, false, avatar, null);
      if ('code' in playerOrError) {
        // Room filled up mid-loop (e.g. another player joined concurrently)
        break;
      }

      // Mark this seat as a bot
      playerOrError.isBot = true;
      playerOrError.ready = true; // bots always count as ready

      const bot = new BotPlayer(playerOrError.id, engine);
      bots.push(bot);
    }

    this.roomBots.set(room.id, bots);
    this.attachToEngine(entry, bots);

    return bots.length - existing.length;
  }

  /**
   * Subscribe to engine events for a room that already has bots.
   * Safe to call multiple times — re-attaching replaces the old listener.
   */
  private attachToEngine(entry: RoomEntry, bots: BotPlayer[]): void {
    const { room, engine } = entry;

    // Remove any previous cleanup for this room
    this.cleanups.get(room.id)?.();

    let lastRoundCount = room.roundHistory.length;

    const offRole = engine.on('roleAssigned', ({ playerId }) => {
      const bot = bots.find((b) => b.playerId === playerId);
      if (bot) bot.onRoleAssigned();
    });

    const offState = engine.on('stateChanged', ({ room: updatedRoom }) => {
      if (updatedRoom.phase === Phase.GameOver) return;

      // Notify bots of new round completions first (for memory)
      const currentRoundCount = updatedRoom.roundHistory.length;
      if (currentRoundCount > lastRoundCount) {
        const view = updatedRoom.viewFor(bots[0]?.playerId ?? '');
        for (const bot of bots) {
          bot.onRoundCompleted(view);
        }
        lastRoundCount = currentRoundCount;
      }

      // Then let each bot decide whether to act
      for (const bot of bots) {
        bot.onStateChanged();
      }
    });

    const cleanup = () => {
      offRole();
      offState();
      for (const bot of bots) bot.dispose();
    };

    this.cleanups.set(room.id, cleanup);
  }

  /**
   * Remove all bots from a room and clean up listeners.
   * Call when the room closes or restarts.
   */
  detach(roomId: string): void {
    this.cleanups.get(roomId)?.();
    this.cleanups.delete(roomId);
    this.roomBots.delete(roomId);
  }

  /** True if the room already has bot seats. */
  hasBots(roomId: string): boolean {
    return (this.roomBots.get(roomId)?.length ?? 0) > 0;
  }

  /** Bot player ids for `roomId`. */
  botIds(roomId: string): string[] {
    return (this.roomBots.get(roomId) ?? []).map((b) => b.playerId);
  }

  dispose(): void {
    for (const cleanup of this.cleanups.values()) cleanup();
    this.cleanups.clear();
    this.roomBots.clear();
  }
}

/**
 * Factory: build a BotManager only when the `bots` feature flag is on.
 * Returns null otherwise so callers can gate cheaply.
 */
export function createBotManager(flags: FeatureFlags): BotManager | null {
  return flags.bots ? new BotManager() : null;
}
