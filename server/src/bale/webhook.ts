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
  broadcastDoneReply,
  broadcastEmptyReply,
  broadcastHelpReply,
  broadcastPlayerReply,
  broadcastStartedReply,
  createPasswordDm,
  createPasswordFallbackReply,
  createRateLimitedReply,
  handleBotText,
  isBroadcastCommand,
  isDirectMessageCommand,
  isUnsendCommand,
  messageAskTextReply,
  messageBadIdsReply,
  messageHelpReply,
  parseBotCommand,
  parseChatIds,
  parseMessageArg,
  unsendDoneReply,
  unsendEmptyReply,
  unsendStartedReply,
  type BotReply,
} from './commands';
import { createGroupRoom } from './createGroupRoom';
import type { BaleSeatIndex } from './BaleSeatIndex';
import type { BotSubscriberStore } from './BotSubscriberStore';
import type { ProductTracker } from '../product/ProductTracker';
import { isAdminUser, parsePlayGameSeat } from './adminIds';
import {
  ensureAdminPlayTable,
  playGameReadyReply,
  playGameSeatHelpReply,
} from './adminPlay';

/** Minimal Bale send surface so tests can stub the client. */
export interface BaleMessenger {
  sendMessage(params: {
    chat_id: number | string;
    text: string;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
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
  deleteMessage?(params: { chat_id: number | string; message_id: number }): Promise<unknown>;
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
  adminUserIds: ReadonlySet<number>;
  subscribers?: BotSubscriberStore;
  /** Pause between broadcast DMs. Tests leave this at 0. */
  broadcastDelayMs?: number;
  product?: ProductTracker;
}

const SECRET_HEADER = 'x-telegram-bot-api-secret-token';
const GROUP_CREATE_LIMIT = new RateLimiter(3, 60_000);

type AdminDraft =
  | { step: 'broadcast-text' }
  | { step: 'message-ids' }
  | { step: 'message-text'; chatIds: string[] };

const adminDrafts = new Map<string, AdminDraft>();

function adminDraftKey(kind: MessengerKind, chatId: number): string {
  return `${kind}:${chatId}`;
}

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

  const chatId = String(chat.id);
  if (chatId) {
    const inserted = await table?.subscribers?.upsert(kind, chatId);
    if (inserted) table?.product?.botStarted(kind, chatId);
  }

  const parsed = parseBotCommand(text);
  if (parsed?.command === 'play_game') {
    // Unknown users must not learn this command exists.
    if (!table || !isAdminUser(seatedId, table.adminUserIds)) {
      return reply.code(200).send({ ok: true });
    }
    adminDrafts.delete(adminDraftKey(kind, chat.id));
    const playReply = handlePlayGame(text, seatedId, repo, messenger, table);
    return sendBotReply(req, reply, messenger, chat.id, playReply);
  }

  if (isBroadcastCommand(parsed?.command)) {
    if (!table || !isAdminUser(seatedId, table.adminUserIds)) {
      return reply.code(200).send({ ok: true });
    }
    return handleBroadcast(req, reply, messenger, table, chat.id, parsed?.arg ?? '');
  }

  if (isDirectMessageCommand(parsed?.command)) {
    if (!table || !isAdminUser(seatedId, table.adminUserIds)) {
      return reply.code(200).send({ ok: true });
    }
    return handleDirectMessage(req, reply, messenger, table, chat.id, parsed?.arg ?? '');
  }

  if (isUnsendCommand(parsed?.command)) {
    if (!table || !isAdminUser(seatedId, table.adminUserIds)) {
      return reply.code(200).send({ ok: true });
    }
    adminDrafts.delete(adminDraftKey(kind, chat.id));
    return handleUnsend(req, reply, messenger, table, chat.id);
  }

  // A draft owns the next private text, even if it looks like /start or a
  // ble.ir/… path. Only the admin commands above cancel it.
  if (table && isAdminUser(seatedId, table.adminUserIds)) {
    const continued = await continueAdminDraft(req, reply, messenger, table, chat.id, text);
    if (continued) return;
  }

  // Heal a missing evergreen lobby (e.g. wiped after reconnect grace).
  table?.sockets.ensurePublicLobby();

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

function handlePlayGame(
  text: string,
  fromId: number,
  repo: RoomRepository,
  messenger: BaleRuntime,
  table: BaleTableHooks,
): BotReply {
  const seat = parsePlayGameSeat(parseBotCommand(text)?.arg ?? '');
  if (seat == null) return playGameSeatHelpReply();
  const opened = ensureAdminPlayTable({
    repo,
    sockets: table.sockets,
    recorder: table.recorder,
    userId: fromId,
  });
  if ('error' in opened) return { text: 'نتونستم میز آزمایش رو باز کنم. دوباره بزن.' };
  return playGameReadyReply({
    code: opened.code,
    seat,
    botUsername: messenger.botUsername,
    startLink: startLinkFor(messenger),
  });
}

async function handleBroadcast(
  req: FastifyRequest,
  reply: FastifyReply,
  messenger: BaleRuntime,
  table: BaleTableHooks,
  adminChatId: number,
  body: string,
): Promise<void> {
  const kind = messengerKindOf(messenger);
  const key = adminDraftKey(kind, adminChatId);
  const trimmed = body.trim();
  if (!trimmed) {
    adminDrafts.set(key, { step: 'broadcast-text' });
    return sendBotReply(req, reply, messenger, adminChatId, broadcastHelpReply());
  }
  adminDrafts.delete(key);
  return sendBroadcastToSubscribers(req, reply, messenger, table, adminChatId, trimmed);
}

async function handleDirectMessage(
  req: FastifyRequest,
  reply: FastifyReply,
  messenger: BaleRuntime,
  table: BaleTableHooks,
  adminChatId: number,
  arg: string,
): Promise<void> {
  const kind = messengerKindOf(messenger);
  const key = adminDraftKey(kind, adminChatId);
  const trimmed = arg.trim();
  if (!trimmed) {
    adminDrafts.set(key, { step: 'message-ids' });
    return sendBotReply(req, reply, messenger, adminChatId, messageHelpReply());
  }
  const parsed = parseMessageArg(trimmed);
  if (!parsed) {
    adminDrafts.set(key, { step: 'message-ids' });
    return sendBotReply(req, reply, messenger, adminChatId, messageBadIdsReply());
  }
  const targets = parsed.chatIds.filter((chatId) => chatId !== String(adminChatId));
  if (targets.length === 0) {
    adminDrafts.set(key, { step: 'message-ids' });
    return sendBotReply(req, reply, messenger, adminChatId, messageHelpReply());
  }
  if (!parsed.text) {
    adminDrafts.set(key, { step: 'message-text', chatIds: targets });
    return sendBotReply(req, reply, messenger, adminChatId, messageAskTextReply());
  }
  adminDrafts.delete(key);
  return sendAdminBlast(req, reply, messenger, table, adminChatId, targets, parsed.text, false);
}

async function continueAdminDraft(
  req: FastifyRequest,
  reply: FastifyReply,
  messenger: BaleRuntime,
  table: BaleTableHooks,
  adminChatId: number,
  text: string,
): Promise<boolean> {
  const kind = messengerKindOf(messenger);
  const key = adminDraftKey(kind, adminChatId);
  const draft = adminDrafts.get(key);
  if (!draft) return false;

  if (draft.step === 'broadcast-text') {
    const body = text.trim();
    if (!body) {
      await sendBotReply(req, reply, messenger, adminChatId, broadcastHelpReply());
      return true;
    }
    adminDrafts.delete(key);
    await sendBroadcastToSubscribers(req, reply, messenger, table, adminChatId, body);
    return true;
  }

  if (draft.step === 'message-ids') {
    const ids = parseChatIds(text);
    const oneShot = parseMessageArg(text);
    if (ids && ids.length > 0) {
      const targets = ids.filter((chatId) => chatId !== String(adminChatId));
      if (targets.length === 0) {
        await sendBotReply(req, reply, messenger, adminChatId, messageHelpReply());
        return true;
      }
      adminDrafts.set(key, { step: 'message-text', chatIds: targets });
      await sendBotReply(req, reply, messenger, adminChatId, messageAskTextReply());
      return true;
    }
    if (oneShot?.text) {
      const targets = oneShot.chatIds.filter((chatId) => chatId !== String(adminChatId));
      if (targets.length === 0) {
        await sendBotReply(req, reply, messenger, adminChatId, messageHelpReply());
        return true;
      }
      adminDrafts.delete(key);
      await sendAdminBlast(req, reply, messenger, table, adminChatId, targets, oneShot.text, false);
      return true;
    }
    await sendBotReply(req, reply, messenger, adminChatId, messageBadIdsReply());
    return true;
  }

  const body = text.trim();
  if (!body) {
    await sendBotReply(req, reply, messenger, adminChatId, messageAskTextReply());
    return true;
  }
  adminDrafts.delete(key);
  await sendAdminBlast(req, reply, messenger, table, adminChatId, draft.chatIds, body, false);
  return true;
}

async function sendBroadcastToSubscribers(
  req: FastifyRequest,
  reply: FastifyReply,
  messenger: BaleRuntime,
  table: BaleTableHooks,
  adminChatId: number,
  body: string,
): Promise<void> {
  const subscribers = table.subscribers;
  if (!subscribers) {
    return sendBotReply(req, reply, messenger, adminChatId, broadcastEmptyReply());
  }
  const kind = messengerKindOf(messenger);
  const targets = await subscribers.list(kind);
  if (targets.length === 0) {
    return sendBotReply(req, reply, messenger, adminChatId, broadcastEmptyReply());
  }
  return sendAdminBlast(req, reply, messenger, table, adminChatId, targets, body, true);
}

async function sendAdminBlast(
  req: FastifyRequest,
  reply: FastifyReply,
  messenger: BaleRuntime,
  table: BaleTableHooks,
  adminChatId: number,
  targets: string[],
  body: string,
  dropFailedSubscribers: boolean,
): Promise<void> {
  const kind = messengerKindOf(messenger);
  const started = await sendChat(req, messenger, adminChatId, broadcastStartedReply(targets.length));
  if (!started) {
    return reply.code(500).send({ error: 'Failed to send reply' });
  }

  const blast = broadcastPlayerReply(
    {
      botUsername: messenger.botUsername,
      startLink: startLinkFor(messenger),
      platform: kind,
    },
    body,
  );
  const delayMs = table.broadcastDelayMs ?? 0;
  let sent = 0;
  let failed = 0;
  const deliveries: { chatId: string; messageId: number }[] = [];
  for (const chatId of targets) {
    const posted = await sendChat(req, messenger, Number(chatId), blast);
    if (posted) {
      sent += 1;
      if (posted.message_id != null) {
        deliveries.push({ chatId, messageId: posted.message_id });
      }
    } else {
      failed += 1;
      if (dropFailedSubscribers) await table.subscribers?.remove(kind, chatId);
    }
    if (delayMs > 0) await sleep(delayMs);
  }
  await table.subscribers?.replaceLastBlast(kind, deliveries);
  table.product?.blastSent(
    kind,
    deliveries.map((row) => row.chatId),
  );
  await sendChat(req, messenger, adminChatId, broadcastDoneReply(sent, failed));
  return reply.code(200).send({ ok: true });
}

async function handleUnsend(
  req: FastifyRequest,
  reply: FastifyReply,
  messenger: BaleRuntime,
  table: BaleTableHooks,
  adminChatId: number,
): Promise<void> {
  const kind = messengerKindOf(messenger);
  const deliveries = (await table.subscribers?.listLastBlast(kind)) ?? [];
  if (deliveries.length === 0) {
    return sendBotReply(req, reply, messenger, adminChatId, unsendEmptyReply());
  }

  const started = await sendChat(req, messenger, adminChatId, unsendStartedReply(deliveries.length));
  if (!started) {
    return reply.code(500).send({ error: 'Failed to send reply' });
  }

  const delayMs = table.broadcastDelayMs ?? 0;
  let deleted = 0;
  let failed = 0;
  const remaining: { chatId: string; messageId: number }[] = [];
  for (const delivery of deliveries) {
    const ok = await deleteChatMessage(req, messenger, delivery.chatId, delivery.messageId);
    if (ok) deleted += 1;
    else {
      failed += 1;
      remaining.push(delivery);
    }
    if (delayMs > 0) await sleep(delayMs);
  }
  await table.subscribers?.replaceLastBlast(kind, remaining);
  await sendChat(req, messenger, adminChatId, unsendDoneReply(deleted, failed));
  return reply.code(200).send({ ok: true });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const entry = repo.getByCode(created.code);
  if (entry) {
    table.product?.groupRoomCreated(entry.room, `${messengerKindOf(bale)}:${fromId}`);
  }

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

async function deleteChatMessage(
  req: FastifyRequest,
  bale: BaleRuntime,
  chatId: string,
  messageId: number,
): Promise<boolean> {
  if (!bale.bot.deleteMessage) return false;
  try {
    await bale.bot.deleteMessage({ chat_id: Number(chatId), message_id: messageId });
    return true;
  } catch (error) {
    req.log.error(error, 'Failed to delete bot message');
    return false;
  }
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
      const sent = await bale.bot.sendMessage({
        chat_id: chatId,
        text: response.text,
      });
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
