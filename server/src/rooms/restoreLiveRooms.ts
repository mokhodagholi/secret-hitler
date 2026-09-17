import { Room } from '@secret-hitler/shared';
import type { GameResultRecorder } from '../history/GameResultRecorder';
import type { RoomRepository } from './RoomRepository';
import type { TokenStore } from './TokenStore';
import type { SocketHandler } from '../ws/SocketHandler';
import type { LiveRoomStore } from './LiveRoomStore';

/**
 * Rebuild engines from the last durable snapshot. Occupied lobbies and
 * in-progress matches stay for reconnect; finished games are adopted then
 * dropped. One bad row must not prevent the rest of the tables from coming back.
 */
export async function restoreLiveRooms(args: {
  repo: RoomRepository;
  tokens: TokenStore;
  sockets: SocketHandler;
  recorder: GameResultRecorder;
  live: LiveRoomStore;
}): Promise<number> {
  const snapshots = await args.live.loadAll();
  let restored = 0;
  for (const snapshot of snapshots) {
    try {
      const room = Room.fromSnapshot(snapshot.room);
      for (const player of room.players) player.connected = false;
      const entry = args.repo.restore(room);
      for (const token of snapshot.tokens) {
        args.tokens.restore(token.token, {
          roomId: room.id,
          playerId: token.playerId,
        });
      }
      args.sockets.adoptRestored(entry);
      if (!args.repo.get(room.id)) continue;
      args.recorder.attach(entry);
      restored += 1;
    } catch (error) {
      console.error('Failed to restore a live room', error);
    }
  }
  return restored;
}
