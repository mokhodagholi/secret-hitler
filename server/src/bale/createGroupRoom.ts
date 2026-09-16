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

export type GroupRoomCreated =
  | {
      reply: BotReply;
      password: string;
      code: string;
    }
  | {
      reply: BotReply;
      code: string;
    };

/**
 * Open a lobby named after the group sender. When `roomPassword` is on, the
 * lobby is locked: members of `chatId` skip the password on join; the
 * plaintext is only returned so the bot can DM it (we store the hash).
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
  roomPassword?: boolean;
}): GroupRoomCreated | { reply: BotReply } {
  const creatorName = params.creatorName.trim() || 'میزبان';
  const lockWithPassword = params.roomPassword === true;
  const password = lockWithPassword ? makeRoomCode() : null;
  const platform = params.platform ?? 'bale';
  const entry = params.repo.create({
    name: creatorName,
    passwordHash: password ? hashPassword(password) : null,
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

  const reply = createGroupPostedReply({
    creatorName,
    code: entry.room.code,
    botUsername: params.botUsername,
    startLink: params.startLink,
    platform,
  });
  if (password == null) {
    return { reply, code: entry.room.code };
  }
  return {
    reply,
    password,
    code: entry.room.code,
  };
}
