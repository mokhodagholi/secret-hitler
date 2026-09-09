import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Update } from 'bale-bot' with { 'resolution-mode': 'import' };
import type { RoomRepository } from '../rooms/RoomRepository';
import { BALE_BOT_COMMANDS, handleBotText, type BotReply } from './commands';
import type { BaleSeatIndex } from './BaleSeatIndex';

/** Minimal Bale send surface so tests can stub the client. */
export interface BaleMessenger {
  sendMessage(params: {
    chat_id: number;
    text: string;
    reply_markup?: BotReply['reply_markup'];
  }): Promise<unknown>;
  setMyCommands?(params: { commands: { command: string; description: string }[] }): Promise<unknown>;
  setWebhook?(params: { url: string }): Promise<unknown>;
}

export interface BaleRuntime {
  bot: BaleMessenger;
  botToken: string;
  publicUrl?: string;
  botUsername: string;
  seats: BaleSeatIndex;
}

function isUpdate(body: unknown): body is Update {
  return (
    !!body &&
    typeof body === 'object' &&
    'update_id' in body &&
    typeof (body as { update_id: unknown }).update_id === 'number'
  );
}

export async function handleBaleWebhook(
  req: FastifyRequest,
  reply: FastifyReply,
  repo: RoomRepository,
  bale: BaleRuntime | undefined,
): Promise<void> {
  if (!bale) {
    return reply.code(503).send({ error: 'Bale bot is not configured' });
  }
  if (!isUpdate(req.body)) {
    return reply.code(400).send({ error: 'Invalid update' });
  }

  const message = req.body.message;
  const text = message?.text?.trim();
  const chat = message?.chat;
  if (!text || !chat || chat.type !== 'private') {
    return reply.code(200).send({ ok: true });
  }

  const fromId = message.from?.id;
  if (fromId == null) {
    return reply.code(200).send({ ok: true });
  }

  const response = handleBotText({
    text,
    fromId,
    lobbies: repo.listPublic(),
    games: repo.listAll(),
    seated: bale.seats.get(fromId),
    botUsername: bale.botUsername,
  });

  try {
    await bale.bot.sendMessage({
      chat_id: chat.id,
      text: response.text,
      reply_markup: response.reply_markup,
    });
  } catch (error) {
    req.log.error(error, 'Failed to send Bale bot reply');
    return reply.code(500).send({ error: 'Failed to send reply' });
  }

  return reply.code(200).send({ ok: true });
}

export async function registerBaleCommands(bot: BaleMessenger): Promise<void> {
  if (!bot.setMyCommands) return;
  try {
    await bot.setMyCommands({ commands: BALE_BOT_COMMANDS });
  } catch {
    // Bale's Bot API still returns HTTP 501 for setMyCommands.
  }
}
