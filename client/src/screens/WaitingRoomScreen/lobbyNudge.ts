import { Phase, type RoomSummary } from '@secret-hitler/shared';

/** Sit for a minute before the first offer, then refresh the live list on this cadence. */
export const lobbyNudgeTiming = {
  firstWaitMs: 60_000,
  repeatMs: 180_000,
};

/** Six already fills a startable table — do not pull people off it. */
export const LOBBY_NUDGE_BELOW_SEATS = 6;

export function resetLobbyNudgeTiming(): void {
  lobbyNudgeTiming.firstWaitMs = 60_000;
  lobbyNudgeTiming.repeatMs = 180_000;
}

/**
 * The unlocked lobby with the most seats, when it is strictly fuller than
 * this table and this table still has fewer than six. Null when nobody should move.
 */
export function pickFullerLobby(args: {
  rooms: RoomSummary[];
  currentRoomId: string;
  currentCount: number;
}): RoomSummary | null {
  if (args.currentCount >= LOBBY_NUDGE_BELOW_SEATS) return null;

  let best: RoomSummary | null = null;
  for (const room of args.rooms) {
    if (room.id === args.currentRoomId) continue;
    if (room.phase !== Phase.Lobby) continue;
    if (room.hasPassword) continue;
    if (room.playerCount >= room.maxPlayers) continue;
    if (room.playerCount <= args.currentCount) continue;
    if (
      best == null ||
      room.playerCount > best.playerCount ||
      (room.playerCount === best.playerCount && room.id < best.id)
    ) {
      best = room;
    }
  }
  return best;
}
