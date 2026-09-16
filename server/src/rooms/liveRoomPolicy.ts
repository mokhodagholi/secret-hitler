import { Phase, isPublicTable, type Room } from '@secret-hitler/shared';

/** A match that has been dealt and is not on the results screen. */
export function isInProgressLiveGame(room: Room): boolean {
  return room.phase !== Phase.Lobby && room.phase !== Phase.GameOver;
}

/**
 * What belongs on disk across a restart: an occupied reserved public
 * lobby (Accept still open), and tables that are mid-game so seats can
 * reconnect. Hosted waiting rooms and finished games are cheap to recreate
 * and look empty after a boot.
 */
export function shouldPersistLiveRoom(room: Room): boolean {
  if (isPublicTable(room.options) && room.phase === Phase.Lobby) {
    return room.players.length > 0;
  }
  return isInProgressLiveGame(room);
}

/**
 * Empty reserved public rooms are dropped — Find Match waits in the queue.
 * An in-progress match stays only while post-restart reconnect grace is open.
 */
export function shouldKeepEmptyRoom(room: Room, reconnectGrace: boolean): boolean {
  if (isPublicTable(room.options) && room.phase === Phase.Lobby) {
    return room.players.length > 0;
  }
  return reconnectGrace && isInProgressLiveGame(room);
}
