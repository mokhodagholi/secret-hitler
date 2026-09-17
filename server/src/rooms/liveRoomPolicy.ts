import { Phase, isPublicTable, type Room } from '@secret-hitler/shared';

/** A match that has been dealt and is not on the results screen. */
export function isInProgressLiveGame(room: Room): boolean {
  return room.phase !== Phase.Lobby && room.phase !== Phase.GameOver;
}

/** Waiting room with seats — a deploy should not wipe the table. */
export function isOccupiedLobby(room: Room): boolean {
  return room.phase === Phase.Lobby && room.players.length > 0;
}

/**
 * What belongs on disk across a restart: the evergreen public lobby (even
 * empty), occupied waiting rooms, and tables that are mid-game so seats can
 * reconnect. Empty hosted lobbies and finished games are cheap to recreate.
 */
export function shouldPersistLiveRoom(room: Room): boolean {
  if (room.options.adminPlayUserId != null && room.phase === Phase.Lobby) {
    return false;
  }
  if (isPublicTable(room.options) && room.phase === Phase.Lobby) {
    return true;
  }
  if (isOccupiedLobby(room)) return true;
  return isInProgressLiveGame(room);
}

/** Restored seats are all disconnected; keep the table until they return. */
export function needsReconnectGrace(room: Room): boolean {
  return isInProgressLiveGame(room) || isOccupiedLobby(room);
}

/**
 * The public salon stays listed at 0 seats. Occupied lobbies and in-progress
 * matches stay only while post-restart reconnect grace is open.
 */
export function shouldKeepEmptyRoom(room: Room, reconnectGrace: boolean): boolean {
  if (isPublicTable(room.options) && room.phase === Phase.Lobby) {
    return true;
  }
  return reconnectGrace && needsReconnectGrace(room);
}
