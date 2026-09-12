import { makeRoomCode, type MessengerKind } from '@secret-hitler/shared';
import type { RoomRepository } from '../rooms/RoomRepository';
import type { SocketHandler } from '../ws/SocketHandler';
import type { GameResultRecorder } from '../history/GameResultRecorder';
import { hashPassword } from '../http/password';
import type { BaleSeatIndex } from './BaleSeatIndex';
import {
  createFailedReply,
  createGroupPostedReply,
  type BotReply,
} from './commands';

export interface GroupRoomCreated {
  reply: BotReply;
  password: string;
  code: string;
}

/**
 * Open a locked lobby named after the group sender. Members of `chatId`
 * skip the password on join; the plaintext is only returned so the bot
 * can DM it (we store the hash).
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
}): GroupRoomCreated | { reply: BotReply } {
  const creatorName = params.creatorName.trim() || 'میزبان';
  const password = makeRoomCode();
  const platform = params.platform ?? 'bale';
  const entry = params.repo.create({
    name: creatorName,
    passwordHash: hashPassword(password),
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
    }),
    password,
    code: entry.room.code,
  };
}
