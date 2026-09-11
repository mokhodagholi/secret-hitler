import { Phase, type RoomSummary } from '@secret-hitler/shared';
import type { BaleSeat } from './BaleSeatIndex';

export interface BotCommandContext {
  text: string;
  fromId: number;
  /** Joinable lobby rooms (same list the mini-app Join tab shows). */
  lobbies: RoomSummary[];
  /** Every live room, including in-progress games. */
  games: RoomSummary[];
  seated: BaleSeat | undefined;
  /** Bot @username, e.g. `@secret_hitler_bot`. */
  botUsername: string;
}

export interface BotReply {
  text: string;
  reply_markup?: {
    inline_keyboard: Array<Array<{ text: string; url: string }>>;
  };
}

const ROOM_CODE = /^[A-Za-z0-9]{6}$/;

/**
 * Opens the mini-app: `https://ble.ir/bot_name?startapp=` plus an optional
 * payload (room code for invites, anything else later).
 */
export function baleStartLink(botUsername: string, startApp = ''): string {
  const nick = botUsername.replace(/^@/, '');
  return `https://ble.ir/${nick}?startapp=${startApp}`;
}

/** Normalize `/find-game@bot args` → `{ command: 'find_game', arg }`. */
export function parseBotCommand(text: string): { command: string; arg: string } | null {
  const trimmed = text.trim();
  const match = /^\/([A-Za-z0-9_-]+)(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]+))?$/.exec(trimmed);
  if (!match) return null;
  return {
    command: match[1].toLowerCase().replace(/-/g, '_'),
    arg: match[2]?.trim() ?? '',
  };
}

export function playKeyboard(botUsername: string, code?: string) {
  return {
    inline_keyboard: [[{ text: 'بازی کن', url: baleStartLink(botUsername, code) }]],
  };
}

function formatLobby(room: RoomSummary): string {
  const lock = room.hasPassword ? ' 🔒' : '';
  return `${room.name}${lock} — ${room.playerCount}/${room.maxPlayers} — کد ${room.code}`;
}

function formatGame(room: RoomSummary): string {
  const status = room.phase === Phase.Lobby ? 'اتاق انتظار' : 'در حال بازی';
  const lock = room.hasPassword ? ' 🔒' : '';
  return `${room.name}${lock} — ${status} — ${room.playerCount}/${room.maxPlayers} — کد ${room.code}`;
}

function roomButtons(botUsername: string, rooms: RoomSummary[]) {
  return {
    inline_keyboard: rooms.slice(0, 8).map((room) => [
      { text: `ورود ${room.code}`, url: baleStartLink(botUsername, room.code) },
    ]),
  };
}

function startReply(botUsername: string): BotReply {
  return {
    text: [
      'به راز هیتلر خوش اومدید.',
      '',
      'برای شروع، دکمهٔ پایین رو بزن. اگه لینک دعوت داری، همون رو باز کن تا مستقیم بری سر میز.',
      '',
      '/find_game — اتاق باز پیدا کن',
      '/games — بازی‌های در جریان',
      '/join CODE — با کد اتاق بیا تو',
      '/invite — لینک دعوت دوستات',
      '',
      baleStartLink(botUsername),
    ].join('\n'),
    reply_markup: playKeyboard(botUsername),
  };
}

function findGameReply(ctx: BotCommandContext): BotReply {
  const open = ctx.lobbies.filter((room) => room.playerCount < room.maxPlayers);
  if (open.length === 0) {
    return {
      text: ['الان اتاق بازی نیست. یکی بساز:', baleStartLink(ctx.botUsername)].join('\n'),
      reply_markup: playKeyboard(ctx.botUsername),
    };
  }
  return {
    text: ['اتاق‌های باز:', '', ...open.map(formatLobby)].join('\n'),
    reply_markup: roomButtons(ctx.botUsername, open),
  };
}

function gamesReply(ctx: BotCommandContext): BotReply {
  if (ctx.games.length === 0) {
    return {
      text: ['الان هیچ بازی‌ای در جریان نیست. یکی بساز:', baleStartLink(ctx.botUsername)].join('\n'),
      reply_markup: playKeyboard(ctx.botUsername),
    };
  }
  return {
    text: ['بازی‌های در جریان:', '', ...ctx.games.map(formatGame)].join('\n'),
    reply_markup: roomButtons(
      ctx.botUsername,
      ctx.games.filter((room) => room.phase === Phase.Lobby && room.playerCount < room.maxPlayers),
    ),
  };
}

function joinReply(ctx: BotCommandContext, arg: string): BotReply {
  const code = arg.toUpperCase();
  if (!ROOM_CODE.test(code)) {
    return {
      text: 'کد اتاق رو بعد از دستور بنویس، مثلاً:\n/join ABC123',
      reply_markup:
        ctx.lobbies.length > 0
          ? roomButtons(ctx.botUsername, ctx.lobbies)
          : playKeyboard(ctx.botUsername),
    };
  }
  const room = ctx.games.find((item) => item.code === code);
  if (!room) {
    return { text: `اتاقی با کد ${code} پیدا نشد.` };
  }
  if (room.phase !== Phase.Lobby) {
    return { text: `اتاق ${room.name} (${code}) دیگه تو اتاق انتظار نیست.` };
  }
  if (room.playerCount >= room.maxPlayers) {
    return { text: `اتاق ${room.name} (${code}) پره.` };
  }
  const lock = room.hasPassword ? '\nاین اتاق رمز داره؛ تو بازی ازت می‌پرسه.' : '';
  const link = baleStartLink(ctx.botUsername, code);
  return {
    text: `ورود به ${room.name} — کد ${code}${lock}\n${link}`,
    reply_markup: playKeyboard(ctx.botUsername, code),
  };
}

function inviteReply(ctx: BotCommandContext, arg: string): BotReply {
  const code = (arg || ctx.seated?.code || '').toUpperCase();
  if (!ROOM_CODE.test(code)) {
    return {
      text: 'اول تو بازی یه اتاق بساز یا برو تو یکی، بعد /invite بزن.\nیا کد رو بنویس: /invite ABC123',
      reply_markup: playKeyboard(ctx.botUsername),
    };
  }
  const room = ctx.games.find((item) => item.code === code);
  const name = room?.name ?? ctx.seated?.roomName ?? code;
  const link = baleStartLink(ctx.botUsername, code);
  return {
    text: `بیا راز هیتلر — ${name}\nکد اتاق: ${code}\n${link}`,
    reply_markup: {
      inline_keyboard: [[{ text: 'ورود به اتاق', url: link }]],
    },
  };
}

/**
 * Map an inbound private-chat text to a reply. Unknown slash-commands get help;
 * a bare 6-character code is treated as /join.
 */
export function handleBotText(ctx: BotCommandContext): BotReply {
  const parsed = parseBotCommand(ctx.text);
  const command = parsed?.command;
  const arg = parsed?.arg ?? '';

  if (!parsed && ROOM_CODE.test(ctx.text.trim())) {
    return joinReply(ctx, ctx.text.trim());
  }

  switch (command) {
    case 'start':
      if (arg && ROOM_CODE.test(arg)) return joinReply(ctx, arg);
      return startReply(ctx.botUsername);
    case 'find_game':
    case 'findgame':
      return findGameReply(ctx);
    case 'games':
    case 'game':
      return gamesReply(ctx);
    case 'join':
      return joinReply(ctx, arg);
    case 'invite':
      return inviteReply(ctx, arg);
    case 'help':
      return startReply(ctx.botUsername);
    default:
      return startReply(ctx.botUsername);
  }
}

export const BALE_BOT_COMMANDS = [
  { command: 'start', description: 'شروع بازی' },
  { command: 'find_game', description: 'پیدا کردن اتاق باز' },
  { command: 'games', description: 'بازی‌های در جریان' },
  { command: 'join', description: 'ورود با کد اتاق' },
  { command: 'invite', description: 'دعوت دوستان' },
];
