import type { MessengerKind } from '@secret-hitler/shared';
import type { RoomRepository } from '../rooms/RoomRepository';
import type { SocketHandler } from '../ws/SocketHandler';
import type { GameResultRecorder } from '../history/GameResultRecorder';
import type { BaleSeatIndex } from './BaleSeatIndex';
import {
  createFailedReply,
  createGroupPostedReply,
  type BotReply,
} from './commands';

export type GroupRoomCreated =
  | {
      reply: BotReply;
      code: string;
    }
  | {
      reply: BotReply;
    };

/**
 * Open an unlocked lobby named after the group sender. It is listed on Join
 * so anyone can sit — group members use the chat button; everyone else can
 * pick it from the room list.
 */
export function createGroupRoom(params: {
  repo: RoomRepository;
  sockets: SocketHandler;
  recorder: GameResultRecorder;
  seats: BaleSeatIndex;
  botUsername: string;
  startLink?: (startApp?: string) => string;
  platform?: MessengerKind;
  chatId: number;
  fromId: number;
  creatorName: string;
}): GroupRoomCreated {
  const creatorName = params.creatorName.trim() || 'میزبان';
  const platform = params.platform ?? 'bale';
  const entry = params.repo.create({
    name: creatorName,
    originChatId: params.chatId,
    originPlatform: platform,
    timerEnabled: true,
  });
  params.sockets.registerEngine(entry);
  params.recorder.attach(entry);

  const host = entry.engine.addPlayer(creatorName, true);
  if ('code' in host) {
    params.repo.remove(entry.room.id);
    return { reply: createFailedReply() };
  }

  params.seats.occupy(
    params.fromId,
    {
      roomId: entry.room.id,
      code: entry.room.code,
      playerId: host.id,
      roomName: entry.room.options.name,
    },
    platform,
  );
  void params.sockets.persistRoom(entry.room.id);

  return {
    reply: createGroupPostedReply({
      creatorName,
      code: entry.room.code,
      botUsername: params.botUsername,
      startLink: params.startLink,
      platform,
    }),
    code: entry.room.code,
  };
}
