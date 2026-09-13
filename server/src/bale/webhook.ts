import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Chat, Update } from 'bale-bot' with { 'resolution-mode': 'import' };
import {
  DEFAULT_TELEGRAM_WEBAPP_SHORT_NAME,
  miniAppStartLink,
  type MessengerKind,
} from '@secret-hitler/shared';
import type { RoomRepository } from '../rooms/RoomRepository';
import type { SocketHandler } from '../ws/SocketHandler';
import type { GameResultRecorder } from '../history/GameResultRecorder';
import { RateLimiter } from '../util/RateLimiter';
import {
  BALE_BOT_COMMANDS,
  createPasswordDm,
  createPasswordFallbackReply,
  createRateLimitedReply,
  handleBotText,
  parseBotCommand,
  type BotReply,
} from './commands';
import { createGroupRoom } from './createGroupRoom';
import type { BaleSeatIndex } from './BaleSeatIndex';

/** Minimal Bale send surface so tests can stub the client. */
export interface BaleMessenger {
  sendMessage(params: {
    chat_id: number | string;
    text: string;
    reply_markup?: BotReply['reply_markup'];
  }): Promise<{ message_id?: number } | unknown>;
  editMessageText?(params: {
    chat_id: number | string;
    message_id: number;
    text: string;
    reply_markup?: BotReply['reply_markup'];
  }): Promise<unknown>;
  setMyCommands?(params: { commands: { command: string; description: string }[] }): Promise<unknown>;
  setWebhook?(params: { url: string; secret_token?: string }): Promise<unknown>;
  getChatMember?(params: {
    chat_id: number | string;
    user_id: number;
  }): Promise<{ status: string; is_member?: boolean }>;
}

export interface BaleRuntime {
  /** Omitted in older tests — treated as Bale. */
  kind?: MessengerKind;
  bot: BaleMessenger;
  botToken: string;
  publicUrl?: string;
  botUsername: string;
  /** Telegram Mini App short name; ignored on Bale. */
  webAppShortName?: string;
  seats: BaleSeatIndex;
  /** When set, incoming webhook posts must present this secret. */
  webhookSecret?: string;
  /** Group the bot posts support letters to. */
  supportChatId?: number | string;
}

export type MessengerRuntime = BaleRuntime;

export function messengerKindOf(runtime: Pick<BaleRuntime, 'kind'>): MessengerKind {
  return runtime.kind ?? 'bale';
}

export function startLinkFor(runtime: BaleRuntime): (startApp?: string) => string {
  const kind = messengerKindOf(runtime);
  return (startApp = '') =>
    miniAppStartLink({
      botUsername: runtime.botUsername,
      startApp,
      platform: kind,
      telegramShortName: runtime.webAppShortName || DEFAULT_TELEGRAM_WEBAPP_SHORT_NAME,
    });
}

/** Live table hooks so `/create` in a group can open a real room. */
export interface BaleTableHooks {
  sockets: SocketHandler;
  recorder: GameResultRecorder;
}

const SECRET_HEADER = 'x-telegram-bot-api-secret-token';
const GROUP_CREATE_LIMIT = new RateLimiter(3, 60_000);

/** Append the secret as a path segment so Bale POSTs to an unguessable URL. */
export function webhookListenUrl(base: string, secret: string | undefined): string {
  if (!secret) return base;
  const trimmed = base.replace(/\/$/, '');
  if (trimmed.endsWith(`/${secret}`)) return trimmed;
  return `${trimmed}/${secret}`;
}

export function webhookSecretMatches(
  provided: string,
  expected: string | undefined,
): boolean {
  if (!expected) return true;
  const left = createHash('sha256').update(provided).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

function providedWebhookSecret(req: FastifyRequest): string {
  const header = req.headers[SECRET_HEADER];
  if (typeof header === 'string' && header.length > 0) return header;
  const param = (req.params as { secret?: string }).secret;
  return typeof param === 'string' ? param : '';
}

function isUpdate(body: unknown): body is Update {
  if (!body || typeof body !== 'object') return false;
  const updateId = (body as { update_id?: unknown }).update_id;
  return typeof updateId === 'number' || (typeof updateId === 'string' && /^-?\d+$/.test(updateId));
}

function asUpdate(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  }
  return body;
}

/** Bale docs say `private`; some payloads omit type or use `pv`. */
function isDirectMessage(chat: Chat | undefined): chat is Chat {
  if (!chat) return false;
  const type = chat.type?.toLowerCase();
  if (type === 'group' || type === 'channel' || type === 'supergroup') return false;
  if (type === 'private' || type === 'pv') return true;
  return !chat.title;
}

function isGroupChat(chat: Chat | undefined): chat is Chat {
  if (!chat) return false;
  const type = chat.type?.toLowerCase();
  return type === 'group' || type === 'supergroup';
}

/**
 * Bale sometimes POSTs JSON as text/plain or with no Content-Type. Fastify
 * would otherwise 415 before the webhook handler runs.
 */
export function registerBaleBodyParser(app: FastifyInstance): void {
  app.addContentTypeParser('*', { parseAs: 'string' }, (_request, body, done) => {
    try {
      const raw = String(body).trim();
      if (!raw) {
        done(null, null);
        return;
      }
      done(null, JSON.parse(raw));
    } catch (error) {
      done(error as Error, undefined);
    }
  });
}

export async function handleMessengerWebhook(
  req: FastifyRequest,
  reply: FastifyReply,
  repo: RoomRepository,
  messenger: BaleRuntime | undefined,
  table?: BaleTableHooks,
): Promise<void> {
  if (!messenger) {
    return reply.code(503).send({ error: 'Bot is not configured' });
  }
  if (!webhookSecretMatches(providedWebhookSecret(req), messenger.webhookSecret)) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  const body = asUpdate(req.body);
  if (!isUpdate(body)) {
    return reply.code(400).send({ error: 'Invalid update' });
  }

  const message = body.message;
  const text = message?.text?.trim();
  const chat = message?.chat;
  if (!message || !text) {
    return reply.code(200).send({ ok: true });
  }

  const fromId = Number(message.from?.id);
  const seatedId = Number.isFinite(fromId) ? fromId : 0;

  const kind = messengerKindOf(messenger);
  if (!isDirectMessage(chat)) {
    if (isGroupChat(chat) && table && Number.isFinite(fromId)) {
      await handleGroupCreate(chat, text, fromId, message.from?.first_name, repo, messenger, table, req);
    }
    return reply.code(200).send({ ok: true });
  }

  const response = handleBotText({
    text,
    fromId: seatedId,
    lobbies: repo.listPublic(),
    games: repo.listAll(),
    seated: Number.isFinite(fromId) ? messenger.seats.get(fromId, kind) : undefined,
    botUsername: messenger.botUsername,
    startLink: startLinkFor(messenger),
    platform: kind,
  });

  return sendBotReply(req, reply, messenger, chat.id, response);
}

export const handleBaleWebhook = handleMessengerWebhook;

async function handleGroupCreate(
  chat: Chat,
  text: string,
  fromId: number,
  firstName: string | undefined,
  repo: RoomRepository,
  bale: BaleRuntime,
  table: BaleTableHooks,
  req: FastifyRequest,
): Promise<void> {
  if (parseBotCommand(text)?.command !== 'create') return;
  if (!GROUP_CREATE_LIMIT.allow(`group:${messengerKindOf(bale)}:${chat.id}`)) {
    await sendChat(req, bale, chat.id, createRateLimitedReply());
    return;
  }

  const created = createGroupRoom({
    repo,
    sockets: table.sockets,
    recorder: table.recorder,
    seats: bale.seats,
    botUsername: bale.botUsername,
    startLink: startLinkFor(bale),
    platform: messengerKindOf(bale),
    chatId: chat.id,
    fromId,
    creatorName: firstName ?? '',
  });
  const posted = await sendChat(req, bale, chat.id, created.reply);
  if ('password' in created && posted?.message_id != null) {
    const entry = repo.getByCode(created.code);
    entry?.room.bindOriginMessage(posted.message_id);
    if (entry) void table.sockets.persistRoom(entry.room.id);
  }
  if (!('password' in created)) return;

  const dm = createPasswordDm({
    name: firstName?.trim() || 'میزبان',
    code: created.code,
    password: created.password,
  });
  const dmSent = await sendChat(req, bale, fromId, dm);
  if (!dmSent) {
    await sendChat(req, bale, chat.id, createPasswordFallbackReply(created.password));
  }
}

async function sendBotReply(
  req: FastifyRequest,
  reply: FastifyReply,
  bale: BaleRuntime,
  chatId: number,
  response: BotReply,
): Promise<void> {
  const sent = await sendChat(req, bale, chatId, response);
  if (!sent) {
    return reply.code(500).send({ error: 'Failed to send reply' });
  }
  return reply.code(200).send({ ok: true });
}

function readMessageId(sent: unknown): number | undefined {
  if (!sent || typeof sent !== 'object') return undefined;
  const id = (sent as { message_id?: unknown }).message_id;
  return typeof id === 'number' ? id : undefined;
}

/** Best-effort send; retries without the keyboard if Bale rejects markup. */
async function sendChat(
  req: FastifyRequest,
  bale: BaleRuntime,
  chatId: number,
  response: BotReply,
): Promise<{ message_id?: number } | null> {
  try {
    const sent = await bale.bot.sendMessage({
      chat_id: chatId,
      text: response.text,
      reply_markup: response.reply_markup,
    });
    return { message_id: readMessageId(sent) };
  } catch (error) {
    req.log.error(error, 'Failed to send bot reply');
    if (!response.reply_markup) return null;
    try {
      const sent = await bale.bot.sendMessage({ chat_id: chatId, text: response.text });
      return { message_id: readMessageId(sent) };
    } catch (retryError) {
      req.log.error(retryError, 'Failed to send bot reply without markup');
      return null;
    }
  }
}

export async function registerBaleCommands(bot: BaleMessenger): Promise<void> {
  if (!bot.setMyCommands) return;
  try {
    await bot.setMyCommands({ commands: BALE_BOT_COMMANDS });
  } catch {
    // Bale's Bot API still returns HTTP 501 for setMyCommands.
  }
}
