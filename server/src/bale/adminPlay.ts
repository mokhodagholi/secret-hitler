import { ADMIN_PLAY_SEAT_COUNT, playGameStartApp } from '@secret-hitler/shared';
import type { RoomRepository } from '../rooms/RoomRepository';
import type { SocketHandler } from '../ws/SocketHandler';
import type { GameResultRecorder } from '../history/GameResultRecorder';
import type { BotReply } from './commands';

const SEAT_NAMES = ['بازیکن ۱', 'بازیکن ۲', 'بازیکن ۳', 'بازیکن ۴', 'بازیکن ۵'] as const;

export function playGameSeatHelpReply(): BotReply {
  return {
    text: `شماره صندلی ۱ تا ${ADMIN_PLAY_SEAT_COUNT} رو بنویس، مثلاً:\n/play-game 1`,
  };
}

export function playGameReadyReply(params: {
  code: string;
  seat: number;
  botUsername: string;
  startLink?: (startApp?: string) => string;
}): BotReply {
  const startApp = playGameStartApp(params.code, params.seat);
  const url = params.startLink
    ? params.startLink(startApp)
    : `https://ble.ir/${params.botUsername.replace(/^@/, '')}?startapp=${startApp}`;
  return {
    text: `میز آزمایش آماده‌ست. تو صندلی ${params.seat} هستی. دکمه رو بزن بری سر میز.`,
    reply_markup: {
      inline_keyboard: [[{ text: 'بازی کن', url }]],
    },
  };
}

/**
 * One 5-seat table per admin. Dummy seats stay connected so deal does not
 * drop them; `/play-game N` later just hands that seat's token to a device.
 */
export function ensureAdminPlayTable(params: {
  repo: RoomRepository;
  sockets: SocketHandler;
  recorder: GameResultRecorder;
  userId: number;
}): { code: string } | { error: string } {
  const existing = params.repo.findAdminPlay(params.userId);
  if (existing) return { code: existing.room.code };

  const entry = params.repo.create({
    name: 'میز آزمایش',
    adminPlayUserId: params.userId,
    timerEnabled: true,
  });
  params.sockets.registerEngine(entry);
  params.recorder.attach(entry);

  for (let index = 0; index < ADMIN_PLAY_SEAT_COUNT; index++) {
    const seated = entry.engine.addPlayer(SEAT_NAMES[index] ?? `بازیکن ${index + 1}`, index === 0);
    if ('code' in seated) {
      params.repo.remove(entry.room.id);
      return { error: seated.message };
    }
    if (index > 0) entry.engine.setReady(seated.id, true);
  }

  const hostId = entry.room.hostId;
  const started = hostId ? entry.engine.startGame(hostId) : { message: 'No host' };
  if (started) {
    params.repo.remove(entry.room.id);
    return { error: started.message };
  }

  void params.sockets.persistRoom(entry.room.id);
  return { code: entry.room.code };
}
