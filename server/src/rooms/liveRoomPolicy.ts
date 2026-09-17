import { Phase, isPublicTable, type Room } from '@secret-hitler/shared';

/** A match that has been dealt and is not on the results screen. */
export function isInProgressLiveGame(room: Room): boolean {
  return room.phase !== Phase.Lobby && room.phase !== Phase.GameOver;
}

/**
 * What belongs on disk across a restart: the evergreen public lobby (even
 * empty), occupied or not, and tables that are mid-game so seats can
 * reconnect. Hosted waiting rooms and finished games are cheap to recreate
 * and look empty after a boot.
 */
export function shouldPersistLiveRoom(room: Room): boolean {
  if (isPublicTable(room.options) && room.phase === Phase.Lobby) {
    return true;
  }
  return isInProgressLiveGame(room);
}

/**
 * The public salon stays listed at 0 seats. An in-progress match stays only
 * while post-restart reconnect grace is open.
 */
export function shouldKeepEmptyRoom(room: Room, reconnectGrace: boolean): boolean {
  if (isPublicTable(room.options) && room.phase === Phase.Lobby) {
    return true;
  }
  return reconnectGrace && isInProgressLiveGame(room);
}
