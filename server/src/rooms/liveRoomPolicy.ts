import { Phase, isPublicTable, type Room } from '@secret-hitler/shared';

/** A match that has been dealt and is not on the results screen. */
export function isInProgressLiveGame(room: Room): boolean {
  return room.phase !== Phase.Lobby && room.phase !== Phase.GameOver;
}

/**
 * What belongs on disk across a restart: the evergreen Join lobby, and
 * tables that are mid-game so seats can reconnect. Hosted waiting rooms
 * and finished games are cheap to recreate and look empty after a boot.
 */
export function shouldPersistLiveRoom(room: Room): boolean {
  if (isPublicTable(room.options) && room.phase === Phase.Lobby) return true;
  return isInProgressLiveGame(room);
}

/**
 * An empty public lobby stays on Join. An in-progress match stays only
 * while post-restart reconnect grace is still open.
 */
export function shouldKeepEmptyRoom(room: Room, reconnectGrace: boolean): boolean {
  if (isPublicTable(room.options) && room.phase === Phase.Lobby) return true;
  return reconnectGrace && isInProgressLiveGame(room);
}
