import { Phase, miniAppStartLink, type MessengerKind, type RoomSummary } from '@secret-hitler/shared';
import type { BaleSeat } from './BaleSeatIndex';

/** Slash is optional so a typed `start` still matches — Bale's menu often omits `/`. */
const KNOWN_COMMANDS = new Set([
  'start',
  'help',
  'find_game',
  'findgame',
  'games',
  'game',
  'join',
  'invite',
  'create',
  'play_game',
]);

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
  /** Mini-app deep link for this bot. Defaults to Bale `ble.ir`. */
  startLink?: (startApp?: string) => string;
  platform?: MessengerKind;
}

export interface BotReply {
  text: string;
  reply_markup?: {
    inline_keyboard: Array<Array<{ text: string; url: string }>>;
  };
}

const ROOM_CODE = /^[A-Za-z0-9]{6}$/;

/**
 * Mini-app deep link for this bot. Defaults to Bale when `startLink` is omitted
 * so existing command tests stay on `ble.ir`.
 */
export function baleStartLink(botUsername: string, startApp = ''): string {
  return miniAppStartLink(botUsername, startApp);
}

export function messengerStartLink(params: {
  botUsername: string;
  startApp?: string;
  platform?: MessengerKind;
  telegramShortName?: string;
}): string {
  return miniAppStartLink(params);
}

function linkOf(
  ctx: Pick<BotCommandContext, 'botUsername' | 'startLink'>,
  startApp = '',
): string {
  return ctx.startLink ? ctx.startLink(startApp) : baleStartLink(ctx.botUsername, startApp);
}

/** Bale always parses Markdown; unmatched `_` * ` [ make sendMessage fail. */
export function escapeBaleMarkdown(text: string): string {
  return text.replace(/([_*`\[\]])/g, '\\$1');
}

/** Slash command as Bale Markdown. `_` must be escaped or sendMessage fails. */
export function markdownSlashCommand(name: string): string {
  return `/${escapeBaleMarkdown(name)}`;
}

/** Normalize `/find-game@bot args` or a bare known command → `{ command: 'find_game', arg }`. */
export function parseBotCommand(text: string): { command: string; arg: string } | null {
  const trimmed = text.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
  const match = /^(\/)?([A-Za-z0-9_-]+)(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]+))?$/.exec(trimmed);
  if (!match) return null;
  const command = match[2].toLowerCase().replace(/-/g, '_');
  if (!match[1] && !KNOWN_COMMANDS.has(command)) return null;
  return {
    command,
    arg: match[3]?.trim() ?? '',
  };
}

export function playKeyboard(botUsername: string, code?: string) {
  return {
    inline_keyboard: [[{ text: 'بازی کن', url: baleStartLink(botUsername, code) }]],
  };
}

function playKeyboardFor(ctx: Pick<BotCommandContext, 'botUsername' | 'startLink'>, code?: string) {
  return {
    inline_keyboard: [[{ text: 'بازی کن', url: linkOf(ctx, code) }]],
  };
}

function roomDisplayName(room: RoomSummary): string {
  return room.kind === 'public' ? 'میز عمومی' : room.name;
}

function formatLobby(room: RoomSummary): string {
  const lock = room.hasPassword ? ' 🔒' : '';
  return `${roomDisplayName(room)}${lock} — ${room.playerCount}/${room.maxPlayers} — کد ${room.code}`;
}

function formatGame(room: RoomSummary): string {
  const status = room.phase === Phase.Lobby ? 'اتاق انتظار' : 'در حال بازی';
  const lock = room.hasPassword ? ' 🔒' : '';
  return `${roomDisplayName(room)}${lock} — ${status} — ${room.playerCount}/${room.maxPlayers} — کد ${room.code}`;
}

function roomButtons(ctx: Pick<BotCommandContext, 'botUsername' | 'startLink'>, rooms: RoomSummary[]) {
  return {
    inline_keyboard: rooms.slice(0, 8).map((room) => [
      { text: `ورود ${room.code}`, url: linkOf(ctx, room.code) },
    ]),
  };
}

function startReply(ctx: Pick<BotCommandContext, 'botUsername' | 'startLink'>): BotReply {
  return {
    text: [
      'به راز هیتلر خوش اومدید.',
      '',
      'برای شروع، دکمهٔ پایین رو بزن. اگه لینک دعوت داری، همون رو باز کن تا مستقیم بری سر میز.',
      '',
      `${markdownSlashCommand('find_game')} — اتاق باز پیدا کن`,
      '/games — بازی‌های در جریان',
      '/join CODE — با کد اتاق بیا تو',
      '/invite — لینک دعوت دوستات',
      '/create — تو گروه میز باز کن',
    ].join('\n'),
    reply_markup: playKeyboardFor(ctx),
  };
}

function findGameReply(ctx: BotCommandContext): BotReply {
  const open = ctx.lobbies.filter((room) => room.playerCount < room.maxPlayers);
  if (open.length === 0) {
    return {
      text: 'الان اتاق بازی نیست. یکی بساز:',
      reply_markup: playKeyboardFor(ctx),
    };
  }
  return {
    text: ['اتاق‌های باز:', '', ...open.map(formatLobby)].join('\n'),
    reply_markup: roomButtons(ctx, open),
  };
}

function gamesReply(ctx: BotCommandContext): BotReply {
  if (ctx.games.length === 0) {
    return {
      text: 'الان هیچ بازی‌ای در جریان نیست. یکی بساز:',
      reply_markup: playKeyboardFor(ctx),
    };
  }
  return {
    text: ['بازی‌های در جریان:', '', ...ctx.games.map(formatGame)].join('\n'),
    reply_markup: roomButtons(
      ctx,
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
          ? roomButtons(ctx, ctx.lobbies)
          : playKeyboardFor(ctx),
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
  return {
    text: `ورود به ${room.name} — کد ${code}${lock}`,
    reply_markup: playKeyboardFor(ctx, code),
  };
}

function inviteReply(ctx: BotCommandContext, arg: string): BotReply {
  const code = (arg || ctx.seated?.code || '').toUpperCase();
  if (!ROOM_CODE.test(code)) {
    return {
      text: 'اول تو بازی یه اتاق بساز یا برو تو یکی، بعد /invite بزن.\nیا کد رو بنویس: /invite ABC123',
      reply_markup: playKeyboardFor(ctx),
    };
  }
  const room = ctx.games.find((item) => item.code === code);
  const name = room?.name ?? ctx.seated?.roomName ?? code;
  const link = linkOf(ctx, code);
  return {
    text: `بیا راز هیتلر — ${name}\nکد اتاق: ${code}`,
    reply_markup: {
      inline_keyboard: [[{ text: 'ورود به اتاق', url: link }]],
    },
  };
}

/** `/create` only opens a table in a group, not in a private chat. */
export function createInPrivateReply(): BotReply {
  return {
    text: 'این دستور مال گروه‌هاست. تو یه گروه /create بزن تا میز باز بشه.',
  };
}

export function createRateLimitedReply(): BotReply {
  return { text: 'یه کم صبر کن. الان نمی‌شه پشت‌سرهم اتاق ساخت.' };
}

export function createFailedReply(): BotReply {
  return { text: 'نتونستم اتاق بسازم. دوباره بزن.' };
}

/** Posted in the group after `/create`. Password stays out of this message. */
export function createGroupPostedReply(params: {
  creatorName: string;
  code: string;
  botUsername: string;
  startLink?: (startApp?: string) => string;
  platform?: MessengerKind;
}): BotReply {
  const link = linkOf(params, params.code);
  return {
    text: [
      'اتاق ساخته شد.',
      `میز ${params.creatorName} — کد ${params.code}`,
      'از همین گروه با دکمه بیا تو. از بیرون رمز می‌خواد.',
    ].join('\n'),
    reply_markup: {
      inline_keyboard: [[{ text: 'ورود به اتاق', url: link }]],
    },
  };
}

/** Replaces the group `/create` post when the host leaves and the table dies. */
export function createGroupClosedReply(params: { creatorName: string }): BotReply {
  return {
    text: ['میزبان رفت.', `میز ${params.creatorName} بسته شد.`].join('\n'),
    reply_markup: { inline_keyboard: [] },
  };
}

/** Private DM to the person who ran `/create`, so outsiders can still be invited. */
export function createPasswordDm(params: {
  name: string;
  code: string;
  password: string;
}): BotReply {
  return {
    text: [
      `رمز اتاق ${params.name} (${params.code}) برای کسی که تو گروه نیست:`,
      '',
      params.password,
    ].join('\n'),
  };
}

export function createPasswordFallbackReply(password: string): BotReply {
  return { text: `رمز برای کسی که تو گروه نیست: ${password}` };
}

/**
 * Map inbound private-chat text to a reply. Unknown slash-commands get help;
 * a bare 6-character code is treated as /join. Group `/create` is handled in
 * the webhook, not here.
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
      return startReply(ctx);
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
    case 'create':
      return createInPrivateReply();
    case 'help':
      return startReply(ctx);
    default:
      return startReply(ctx);
  }
}

export const BALE_BOT_COMMANDS = [
  { command: 'start', description: 'شروع بازی' },
  { command: 'find_game', description: 'پیدا کردن اتاق باز' },
  { command: 'games', description: 'بازی‌های در جریان' },
  { command: 'join', description: 'ورود با کد اتاق' },
  { command: 'invite', description: 'دعوت دوستان' },
  { command: 'create', description: 'ساخت میز تو گروه' },
];
