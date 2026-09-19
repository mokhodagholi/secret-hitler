import { describe, expect, it } from '@rstest/core';
import { createHmac } from 'node:crypto';
import { DEFAULT_FLAGS, type RoomSummary } from '@secret-hitler/shared';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';
import type { RoomRepository } from '../rooms/RoomRepository';
import { BaleSeatIndex } from './BaleSeatIndex';
import { InMemoryBotSubscriberStore } from './InMemoryBotSubscriberStore';
import { InMemoryProductStore } from '../product/InMemoryProductStore';
import { DEFAULT_ADMIN_USER_ID } from './adminIds';
import {
  decideBotWebhookRegistration,
  webhookListenUrl,
  webhookSecretMatches,
  type BaleMessenger,
} from './webhook';

const TOKEN = '123456:test-token';

function groupTable(repo: RoomRepository) {
  const entry = repo
    .listEntries()
    .find((item) => item.room.options.originChatId != null);
  expect(entry).toBeTruthy();
  return entry!;
}

async function waitUntil(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 2000,
): Promise<void> {
  const started = Date.now();
  while (!(await predicate())) {
    if (Date.now() - started > timeoutMs) {
      throw new Error('waitUntil timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function signInitData(
  userId: number,
  firstName: string,
  extra: Record<string, string> = {},
): string {
  const fields = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: firstName }),
    ...extra,
  };
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

describe('Bale webhook', () => {
  it('Should reply to /start with a mini-app Play button', async () => {
    const sent: Array<{ text: string; reply_markup?: unknown }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      publicUrl: 'https://mrfantastic.ir',
      bale: {
        bot,
        botToken: 'test-token',
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/start',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain('راز هیتلر');
    expect(sent[0].text).not.toContain('هیتلر مخفی');
    expect(JSON.stringify(sent[0].reply_markup)).toContain(
      'https://ble.ir/secret_hitler_bot?startapp=',
    );
    expect(sent[0].text).not.toContain('بازی کن');
    expect(JSON.stringify(sent[0])).not.toContain('mrfantastic');
  });

  it('Should still reply to /start when Bale omits message.from', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: 'test-token',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/start',
        chat: { id: 9, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain('راز هیتلر');
  });

  it('Should reply when the user types start without a slash', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: 'test-token',
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: 'start',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain('راز هیتلر');
  });

  it('Should still reply when Bale posts JSON as text/plain', async () => {
    const sent: Array<{ text: string }> = [];
    const { app } = await buildServer({
      bale: {
        bot: {
          sendMessage: async (params) => {
            sent.push(params);
            return {};
          },
        },
        botToken: 'test-token',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/bale/webhook',
      headers: { 'content-type': 'text/plain' },
      payload: JSON.stringify({
        update_id: 1,
        message: {
          message_id: 1,
          date: 0,
          text: '/start',
          from: { id: 9, is_bot: false, first_name: 'Ana' },
          chat: { id: 9, type: 'private' },
        },
      }),
    });
    expect(response.statusCode).toBe(200);
    expect(sent).toHaveLength(1);
  });

  it('Should send the greeting without buttons if the keyboard is rejected', async () => {
    const sent: Array<{ text: string; reply_markup?: unknown }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        if (params.reply_markup) throw new Error('bad markup');
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: 'test-token',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/start',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });
    expect(status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].reply_markup).toBeUndefined();
  });

  it('Should reject webhook posts that omit the configured secret', async () => {
    const { app } = await buildServer({
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: 'test-token',
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
        webhookSecret: 's3cret',
      },
    });
    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/start',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });
    expect(status).toBe(401);
  });

  it('Should accept a webhook when the secret is in the path', async () => {
    const sent: Array<{ text: string }> = [];
    const { app } = await buildServer({
      bale: {
        bot: {
          sendMessage: async (params) => {
            sent.push(params);
            return {};
          },
        },
        botToken: 'test-token',
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
        webhookSecret: 's3cret',
      },
    });
    const { status } = await httpJson(app, 'POST', '/api/bale/webhook/s3cret', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/start',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });
    expect(status).toBe(200);
    expect(sent).toHaveLength(1);
  });

  it('Should accept a webhook when the secret is in the Telegram header', async () => {
    const { app } = await buildServer({
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: 'test-token',
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
        webhookSecret: 's3cret',
      },
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/bale/webhook',
      headers: { 'x-telegram-bot-api-secret-token': 's3cret' },
      payload: {
        update_id: 1,
        message: {
          message_id: 1,
          date: 0,
          text: '/start',
          from: { id: 9, is_bot: false, first_name: 'Ana' },
          chat: { id: 9, type: 'private' },
        },
      },
    });
    expect(response.statusCode).toBe(200);
  });

  it('Should refuse mini-app auth without a valid initData signature', async () => {
    const { app } = await buildServer({
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: 'test-token',
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const { status } = await httpJson(app, 'POST', '/api/auth/bale', { initData: 'hash=nope' });
    expect(status).toBe(401);
  });

  it('Should stamp signed startapp=1 on miniapp_auth', async () => {
    const product = new InMemoryProductStore();
    const { app, product: tracker } = await buildServer({
      product,
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: TOKEN,
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const { status, body } = await httpJson(app, 'POST', '/api/auth/miniapp', {
      initData: signInitData(9, 'Ana', { start_param: '1' }),
    });
    await tracker.flush();
    expect(status).toBe(200);
    expect(body).toMatchObject({ id: 9, firstName: 'Ana', platform: 'bale' });
    expect(product.events).toEqual([
      expect.objectContaining({
        name: 'miniapp_auth',
        userKey: 'bale:9',
        payload: { startParam: '1' },
      }),
    ]);
  });

  it('Should take a body startParam when initData has none', async () => {
    const product = new InMemoryProductStore();
    const { app, product: tracker } = await buildServer({
      product,
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: TOKEN,
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    await httpJson(app, 'POST', '/api/auth/miniapp', {
      initData: signInitData(9, 'Ana'),
      startParam: '1',
    });
    await tracker.flush();
    expect(product.events[0]?.payload).toEqual({ startParam: '1' });
  });

  it('Should prefer signed start_param over a spoofed body field', async () => {
    const product = new InMemoryProductStore();
    const { app, product: tracker } = await buildServer({
      product,
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: TOKEN,
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    await httpJson(app, 'POST', '/api/auth/miniapp', {
      initData: signInitData(9, 'Ana', { start_param: '1' }),
      startParam: '2',
    });
    await tracker.flush();
    expect(product.events[0]?.payload).toEqual({ startParam: '1' });
  });
});

describe('Bale webhook — group /create', () => {
  it('Should ignore /start in a group', async () => {
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const { app } = await buildServer({
      bale: {
        bot: {
          sendMessage: async (params) => {
            sent.push(params);
            return {};
          },
        },
        botToken: 'test-token',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/start',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: -100, type: 'group', title: 'Friday' },
      },
    });
    expect(status).toBe(200);
    expect(sent).toHaveLength(0);
  });

  it('Should open a named, locked table from /create in a group', async () => {
    const sent: Array<{ chat_id: number | string; text: string; reply_markup?: unknown }> = [];
    const { app, repo } = await buildServer({
      bale: {
        bot: {
          sendMessage: async (params) => {
            sent.push(params);
            return { message_id: params.chat_id === -401 ? 77 : 12 };
          },
        },
        botToken: 'test-token',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/create',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: -401, type: 'group', title: 'Friday' },
      },
    });

    expect(status).toBe(200);
    const room = groupTable(repo).room;
    expect(room.summary()).toMatchObject({
      name: 'Ana',
      hasPassword: true,
      playerCount: 1,
    });
    expect(room.passwordHash).toBeTruthy();
    expect(room.options.originChatId).toBe(-401);
    expect(room.options.originMessageId).toBe(77);
    expect(repo.listPublic()).toEqual([room.summary()]);
    expect(repo.listAll()).toEqual([room.summary()]);
    const listed = await httpJson<RoomSummary[]>(app, 'GET', '/api/rooms');
    expect(listed.body).toEqual([room.summary()]);

    const groupPost = sent.find((item) => item.chat_id === -401);
    expect(groupPost?.text).toContain('اتاق ساخته شد');
    expect(groupPost?.text).toContain('Ana');
    expect(groupPost?.text).toContain(room.code);
    expect(groupPost?.text).toContain('رمز');
    expect(JSON.stringify(groupPost?.reply_markup)).toContain(
      `https://ble.ir/secret_hitler_bot?startapp=${room.code}`,
    );

    const dm = sent.find((item) => item.chat_id === 9);
    expect(dm?.text).toContain('رمز');
    expect(dm?.text).toContain(room.code);
    const password = dm!.text.trim().split('\n').at(-1);
    expect(password).toMatch(/^[A-Z2-9]{4}$/);
  });

  it('Should list a group table on Join next to the public salon', async () => {
    const { app, repo } = await buildServer({
      flags: { ...DEFAULT_FLAGS, publicTable: true },
      bale: {
        bot: {
          sendMessage: async () => ({ message_id: 1 }),
        },
        botToken: 'test-token',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const before = await httpJson<RoomSummary[]>(app, 'GET', '/api/rooms');
    expect(before.body.filter((room) => room.kind === 'public')).toHaveLength(1);
    const salonCode = before.body[0]?.code;

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/create',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: -405, type: 'group', title: 'Friday' },
      },
    });

    const group = groupTable(repo).room;
    expect(group.options.kind).not.toBe('public');
    expect(group.passwordHash).toBeTruthy();
    expect(group.code).not.toBe(salonCode);

    const after = await httpJson<RoomSummary[]>(app, 'GET', '/api/rooms');
    expect(after.body).toHaveLength(2);
    expect(after.body[0]).toMatchObject({ kind: 'public', code: salonCode });
    expect(after.body.some((room) => room.name === 'Ana' && room.hasPassword === true)).toBe(
      true,
    );
  });

  it('Should post the password in the group when the host DM fails', async () => {
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const { app, repo } = await buildServer({
      bale: {
        bot: {
          sendMessage: async (params) => {
            if (params.chat_id === 9) throw new Error('forbidden');
            sent.push(params);
            return {};
          },
        },
        botToken: 'test-token',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/create',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: -402, type: 'group', title: 'Friday' },
      },
    });

    expect(groupTable(repo).room.passwordHash).toBeTruthy();
    const fallback = sent.find((item) => item.chat_id === -402 && item.text.includes('رمز برای'));
    expect(fallback).toBeTruthy();
    const password = fallback!.text.split(':').at(-1)?.trim();
    expect(password).toMatch(/^[A-Z2-9]{4}$/);
  });

  it('Should let group members join without a password and keep others behind it', async () => {
    const members = new Set<number>([9, 10]);
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const { app, repo, seats } = await buildServer({
      bale: {
        bot: {
          sendMessage: async (params) => {
            sent.push(params);
            return {};
          },
          getChatMember: async ({ user_id }) => {
            if (!members.has(user_id)) throw new Error('not in chat');
            return { status: 'member' as const };
          },
        },
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/create',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: -403, type: 'group', title: 'Friday' },
      },
    });

    const room = groupTable(repo).room;
    const hostId = seats.get(9)?.playerId;
    const dm = sent.find((item) => item.chat_id === 9);
    const password = dm!.text.trim().split('\n').at(-1)!;

    const memberJoin = await httpJson<{ playerId: string }>(
      app,
      'POST',
      `/api/rooms/${room.code}/join`,
      { name: 'Ben', initData: signInitData(10, 'Ben') },
    );
    expect(memberJoin.status).toBe(200);
    expect(memberJoin.body.playerId).not.toBe(hostId);

    const outsiderDenied = await httpJson<{ playerId: string }>(
      app,
      'POST',
      `/api/rooms/${room.code}/join`,
      { name: 'Cal', initData: signInitData(11, 'Cal') },
    );
    expect(outsiderDenied.status).toBe(403);
    expect((outsiderDenied.body as { code: string }).code).toBe('WRONG_PASSWORD');

    const outsiderJoin = await httpJson<{ playerId: string }>(
      app,
      'POST',
      `/api/rooms/${room.code}/join`,
      { name: 'Cal', password, initData: signInitData(11, 'Cal') },
    );
    expect(outsiderJoin.status).toBe(200);

    const fromTheWeb = await httpJson<{ playerId: string }>(
      app,
      'POST',
      `/api/rooms/${room.code}/join`,
      { name: 'Dan' },
    );
    expect(fromTheWeb.status).toBe(403);

    const fromTheWebWithPassword = await httpJson<{ playerId: string }>(
      app,
      'POST',
      `/api/rooms/${room.code}/join`,
      { name: 'Dan', password },
    );
    expect(fromTheWebWithPassword.status).toBe(200);

    const creatorRejoin = await httpJson<{ playerId: string }>(
      app,
      'POST',
      `/api/rooms/${room.code}/join`,
      { name: 'Ana', initData: signInitData(9, 'Ana') },
    );
    expect(creatorRejoin.status).toBe(200);
    expect(creatorRejoin.body.playerId).toBe(hostId);
  });

  it('Should edit the group post when the host leaves the table', async () => {
    const edited: Array<{ chat_id: number | string; message_id: number; text: string }> = [];
    const { app, repo, sockets } = await buildServer({
      bale: {
        bot: {
          sendMessage: async (params) => {
            return { message_id: params.chat_id === -404 ? 88 : 1 };
          },
          editMessageText: async (params) => {
            edited.push(params);
            return true;
          },
        },
        botToken: 'test-token',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/create',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: -404, type: 'group', title: 'Friday' },
      },
    });

    const entry = groupTable(repo);
    const hostId = entry.room.hostId;
    sockets.dropSeat(entry, hostId);

    expect(edited).toHaveLength(1);
    expect(edited[0]).toMatchObject({ chat_id: -404, message_id: 88 });
    expect(edited[0].text).toContain('میزبان رفت');
    expect(edited[0].text).toContain('Ana');
    expect(repo.listEntries()).toHaveLength(0);
  });
});

describe('webhookListenUrl', () => {
  it('Should append the secret once and leave an empty secret alone', () => {
    expect(webhookListenUrl('https://mrfantastic.ir/api/bale/webhook', undefined)).toBe(
      'https://mrfantastic.ir/api/bale/webhook',
    );
    expect(webhookListenUrl('https://mrfantastic.ir/api/bale/webhook', 's3cret')).toBe(
      'https://mrfantastic.ir/api/bale/webhook/s3cret',
    );
    expect(webhookListenUrl('https://mrfantastic.ir/api/bale/webhook/s3cret', 's3cret')).toBe(
      'https://mrfantastic.ir/api/bale/webhook/s3cret',
    );
  });

  it('Should compare secrets without leaking length', () => {
    expect(webhookSecretMatches('s3cret', 's3cret')).toBe(true);
    expect(webhookSecretMatches('nope', 's3cret')).toBe(false);
    expect(webhookSecretMatches('', undefined)).toBe(true);
  });
});

describe('decideBotWebhookRegistration', () => {
  const url = 'https://mrfantastic.ir/api/bale/webhook';

  it('Should skip when BOT_SET_WEBHOOK is off so local boot cannot steal production', () => {
    expect(
      decideBotWebhookRegistration({
        setWebhookEnv: undefined,
        webhookUrl: url,
        webhookSecret: 's3cret',
      }).action,
    ).toBe('skip');
    expect(
      decideBotWebhookRegistration({
        setWebhookEnv: '',
        webhookUrl: url,
        webhookSecret: 's3cret',
      }).action,
    ).toBe('skip');
  });

  it('Should refuse registration when the flag is on but the secret is missing', () => {
    expect(
      decideBotWebhookRegistration({
        setWebhookEnv: 'true',
        webhookUrl: url,
        webhookSecret: undefined,
      }).action,
    ).toBe('refuse');
  });

  it('Should register only when the flag and secret are both set', () => {
    expect(
      decideBotWebhookRegistration({
        setWebhookEnv: 'true',
        webhookUrl: url,
        webhookSecret: 's3cret',
      }).action,
    ).toBe('register');
    expect(
      decideBotWebhookRegistration({
        setWebhookEnv: '1',
        webhookUrl: url,
        webhookSecret: 's3cret',
      }).action,
    ).toBe('register');
  });
});

describe('Telegram webhook', () => {
  it('Should reply to /start with a t.me mini-app button, never ble.ir', async () => {
    const sent: Array<{ text: string; reply_markup?: unknown }> = [];
    const { app } = await buildServer({
      telegram: {
        kind: 'telegram',
        bot: {
          sendMessage: async (params) => {
            sent.push(params);
            return {};
          },
        },
        botToken: 'telegram-token',
        botUsername: '@secret_hitler_bot',
        webAppShortName: 'game',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/telegram/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/start',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(JSON.stringify(sent[0].reply_markup)).toContain(
      'https://t.me/secret_hitler_bot/game?startapp=',
    );
    expect(JSON.stringify(sent[0])).not.toContain('ble.ir');
    expect(JSON.stringify(sent[0])).not.toContain('mrfantastic');
  });

  it('Should open a started test table when the admin types /play-game 1', async () => {
    const sent: Array<{ text: string; reply_markup?: unknown }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app, repo } = await buildServer({
      publicUrl: 'https://mrfantastic.ir',
      bale: {
        bot,
        botToken: TOKEN,
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/play-game 1',
        from: { id: 1_902_004_260, is_bot: false, first_name: 'Admin' },
        chat: { id: 1_902_004_260, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent[0]?.text).toContain('صندلی 1');
    const entry = repo.findAdminPlay(1_902_004_260);
    expect(entry?.room.phase).not.toBe('lobby');
    expect(entry?.room.players).toHaveLength(5);
    expect(JSON.stringify(sent[0].reply_markup)).toContain(
      `startapp=p1${entry?.room.code}`,
    );
  });

  it('Should ignore /play-game from anyone but the admin', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app, repo } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/play-game 1',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent).toEqual([]);
    expect(repo.findAdminPlay(9)).toBeUndefined();
  });
});

describe('Bale webhook — broadcast', () => {
  it('Should remember a private /start so an admin can broadcast later', async () => {
    const subscribers = new InMemoryBotSubscriberStore();
    const product = new InMemoryProductStore();
    const bot: BaleMessenger = {
      sendMessage: async () => ({}),
    };
    const { app, product: tracker } = await buildServer({
      subscribers,
      product,
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/start',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });
    await tracker.flush();

    expect(await subscribers.list('bale')).toEqual(['9']);
    expect(product.events.map((event) => event.name)).toEqual(['bot_start']);
    expect(product.events[0]).toMatchObject({ platform: 'bale', userKey: 'bale:9' });
  });

  it('Should send a retention broadcast to everyone who started, with Play', async () => {
    const subscribers = new InMemoryBotSubscriberStore();
    await subscribers.upsert('bale', '9');
    await subscribers.upsert('bale', '11');
    const sent: Array<{ chat_id: number | string; text: string; reply_markup?: unknown }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      subscribers,
      bale: {
        bot,
        botToken: TOKEN,
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/broadcast امشب ساعت ۹ میز عمومیه',
        from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
        chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent[0]?.text).toContain('3 نفر');
    await waitUntil(() => sent.some((row) => row.text.includes('رسید به 3 نفر')));
    const blasts = sent.filter((row) => row.text.includes('میز عمومیه'));
    expect(blasts).toHaveLength(3);
    expect(blasts.map((row) => Number(row.chat_id)).sort((a, b) => a - b)).toEqual([
      9,
      11,
      DEFAULT_ADMIN_USER_ID,
    ]);
    expect(JSON.stringify(blasts[0]?.reply_markup)).toContain(
      'https://ble.ir/secret_hitler_bot?startapp=',
    );
    expect(sent.at(-1)?.text).toContain('رسید به 3 نفر');
  });

  it('Should ignore /broadcast from anyone but the admin', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/broadcast سلام',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent).toEqual([]);
  });

  it('Should tell the admin to include a message when /broadcast has no text', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/broadcast',
        from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
        chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
      },
    });

    expect(sent[0]?.text).toContain('متن');
  });

  it('Should take /broadcast then the text on the next message', async () => {
    const subscribers = new InMemoryBotSubscriberStore();
    await subscribers.upsert('bale', '9');
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      subscribers,
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const admin = {
      from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
      chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
    };

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: { message_id: 1, date: 0, text: '/broadcast', ...admin },
    });
    expect(sent.at(-1)?.text).toContain('متن');

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 2,
      message: { message_id: 2, date: 0, text: 'امشب بیا', ...admin },
    });
    await waitUntil(() =>
      sent.some((row) => row.chat_id === 9 && row.text.includes('امشب بیا')),
    );
    expect(sent.some((row) => row.chat_id === 9 && row.text.includes('امشب بیا'))).toBe(true);
    expect(
      sent.some(
        (row) => row.chat_id === DEFAULT_ADMIN_USER_ID && row.text.includes('امشب بیا'),
      ),
    ).toBe(true);
  });

  it('Should cancel a /message draft when the admin sends /start', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const admin = {
      from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
      chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
    };

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: { message_id: 1, date: 0, text: '/message', ...admin },
    });
    expect(sent.at(-1)?.text).toContain('آیدی');

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 2,
      message: { message_id: 2, date: 0, text: '/start', ...admin },
    });
    expect(sent.at(-1)?.text).toContain('خوش اومدید');
  });

  it('Should broadcast a body that looks like a ble.ir path, not the start greeting', async () => {
    const subscribers = new InMemoryBotSubscriberStore();
    await subscribers.upsert('bale', '9');
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      subscribers,
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const admin = {
      from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
      chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
    };
    const body = [
      'شناسه اشتباه بود دوستان.',
      'شناسه درست: ble.ir/secret_hitler_official',
    ].join('\n');

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: { message_id: 1, date: 0, text: '/broadcast', ...admin },
    });
    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 2,
      message: { message_id: 2, date: 0, text: body, ...admin },
    });

    await waitUntil(() => sent.some((row) => row.text.includes('شناسه درست')));
    const blasts = sent.filter((row) => row.text.includes('شناسه درست'));
    expect(blasts.length).toBeGreaterThan(0);
    expect(sent.some((row) => row.text.includes('خوش اومدید'))).toBe(false);
  });

  it('Should drop a subscriber who can no longer receive the broadcast', async () => {
    const subscribers = new InMemoryBotSubscriberStore();
    await subscribers.upsert('bale', '9');
    await subscribers.upsert('bale', '11');
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        if (params.chat_id === 11) throw new Error('blocked');
        return {};
      },
    };
    const { app } = await buildServer({
      subscribers,
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/broadcast بیا',
        from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
        chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
      },
    });

    await waitUntil(async () => {
      const remaining = await subscribers.list('bale');
      return remaining.includes('9') && !remaining.includes('11');
    });
    const remaining = await subscribers.list('bale');
    expect(remaining).toContain('9');
    expect(remaining).not.toContain('11');
  });

  it('Should keep a subscriber after a rate-limit failure on broadcast', async () => {
    const subscribers = new InMemoryBotSubscriberStore();
    await subscribers.upsert('bale', '9');
    await subscribers.upsert('bale', '11');
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        if (params.chat_id === 11) {
          const error = new Error('Too Many Requests: retry after 1') as Error & {
            errorCode: number;
            description: string;
          };
          error.errorCode = 429;
          error.description = 'Too Many Requests: retry after 1';
          throw error;
        }
        return {};
      },
    };
    const { app } = await buildServer({
      subscribers,
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/broadcast بیا',
        from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
        chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
      },
    });

    await waitUntil(async () => {
      // Done reply means the fan-out finished; both ids should still be listed.
      const remaining = await subscribers.list('bale');
      return remaining.includes('9') && remaining.includes('11');
    });
    expect(await subscribers.list('bale')).toEqual(expect.arrayContaining(['9', '11']));
  });

  it('Should keep @username mentions unescaped in a broadcast body', async () => {
    const subscribers = new InMemoryBotSubscriberStore();
    await subscribers.upsert('bale', '9');
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      subscribers,
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/broadcast بیا @secret_hitler_official',
        from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
        chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
      },
    });

    await waitUntil(() => sent.some((row) => row.text.includes('@secret_hitler_official')));
    const blasts = sent.filter((row) => row.text.includes('@secret_hitler_official'));
    expect(blasts.length).toBeGreaterThan(0);
    expect(blasts.every((row) => !row.text.includes('\\_'))).toBe(true);
  });

  it('Should list reachable subscriber ids on /users', async () => {
    const subscribers = new InMemoryBotSubscriberStore();
    await subscribers.upsert('bale', '9');
    await subscribers.upsert('bale', '11');
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      subscribers,
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/users',
        from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
        chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
      },
    });

    expect(status).toBe(200);
    const reply = sent.find((row) => row.text.includes('بلاک نکردن'));
    expect(reply?.text).toContain('9');
    expect(reply?.text).toContain('11');
  });

  it('Should ignore /users from anyone but the admin', async () => {
    const subscribers = new InMemoryBotSubscriberStore();
    await subscribers.upsert('bale', '9');
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      subscribers,
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/users',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent.some((row) => row.text.includes('بلاک نکردن'))).toBe(false);
  });

  it('Should send /message only to the comma-separated ids', async () => {
    const sent: Array<{ chat_id: number | string; text: string; reply_markup?: unknown }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        publicUrl: 'https://mrfantastic.ir',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/message 9,11 امشب بیا',
        from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
        chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
      },
    });

    expect(status).toBe(200);
    await waitUntil(() => sent.filter((row) => row.text.includes('امشب بیا')).length >= 2);
    const delivered = sent.filter((row) => row.text.includes('امشب بیا'));
    expect(delivered.map((row) => Number(row.chat_id)).sort((a, b) => a - b)).toEqual([9, 11]);
    expect(JSON.stringify(delivered[0]?.reply_markup)).toContain(
      'https://ble.ir/secret_hitler_bot?startapp=',
    );
  });

  it('Should take /message then ids then the text', async () => {
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const admin = {
      from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
      chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
    };

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: { message_id: 1, date: 0, text: '/message', ...admin },
    });
    expect(sent.at(-1)?.text).toContain('آیدی');

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 2,
      message: { message_id: 2, date: 0, text: '9,11', ...admin },
    });
    expect(sent.at(-1)?.text).toContain('متن');

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 3,
      message: { message_id: 3, date: 0, text: 'امشب بیا', ...admin },
    });
    await waitUntil(() => sent.filter((row) => row.text.includes('امشب بیا')).length >= 2);
    const blasts = sent.filter((row) => row.text.includes('امشب بیا'));
    expect(blasts.map((row) => Number(row.chat_id)).sort((a, b) => a - b)).toEqual([9, 11]);
  });

  it('Should take /message then ids then the text when Bale omits message.from', async () => {
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const adminChat = { chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' as const } };

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: { message_id: 1, date: 0, text: '/message', ...adminChat },
    });
    expect(sent.at(-1)?.text).toContain('آیدی');

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 2,
      message: { message_id: 2, date: 0, text: '9,11', ...adminChat },
    });
    expect(sent.at(-1)?.text).toContain('متن');
    expect(sent.some((row) => row.text.includes('خوش اومدید'))).toBe(false);

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 3,
      message: { message_id: 3, date: 0, text: 'امشب بیا', ...adminChat },
    });
    await waitUntil(() => sent.filter((row) => row.text.includes('امشب بیا')).length >= 2);
    const blasts = sent.filter((row) => row.text.includes('امشب بیا'));
    expect(blasts.map((row) => Number(row.chat_id)).sort((a, b) => a - b)).toEqual([9, 11]);
  });

  it('Should send a /message body that starts with /start instead of the greeting', async () => {
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const admin = {
      from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
      chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
    };
    const body = '/start رو بزن';

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: { message_id: 1, date: 0, text: '/message', ...admin },
    });
    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 2,
      message: { message_id: 2, date: 0, text: '9', ...admin },
    });
    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 3,
      message: { message_id: 3, date: 0, text: body, ...admin },
    });

    await waitUntil(() => sent.some((row) => row.chat_id === 9 && row.text.includes('/start')));
    expect(sent.some((row) => row.chat_id === 9 && row.text.includes('/start رو بزن'))).toBe(true);
    expect(sent.some((row) => row.text.includes('خوش اومدید'))).toBe(false);
  });

  it('Should ignore /message from anyone but the admin', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/message 9 سلام',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent).toEqual([]);
  });

  it('Should delete the last broadcast DMs on /unsend', async () => {
    const subscribers = new InMemoryBotSubscriberStore();
    await subscribers.upsert('bale', '9');
    await subscribers.upsert('bale', '11');
    let nextId = 100;
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const deleted: Array<{ chat_id: number | string; message_id: number }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        nextId += 1;
        return { message_id: nextId };
      },
      deleteMessage: async (params) => {
        deleted.push(params);
        return true;
      },
    };
    const { app } = await buildServer({
      subscribers,
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const admin = {
      from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
      chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
    };

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: { message_id: 1, date: 0, text: '/broadcast بیا کانال', ...admin },
    });
    await waitUntil(() => sent.some((row) => row.text.includes('رسید به')));
    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 2,
      message: { message_id: 2, date: 0, text: '/unsend', ...admin },
    });
    await waitUntil(() => sent.some((row) => row.text.includes('پاک شد')));

    expect(deleted.map((row) => Number(row.chat_id)).sort((a, b) => a - b)).toEqual([
      9,
      11,
      DEFAULT_ADMIN_USER_ID,
    ]);
    expect(sent.at(-1)?.text).toContain('پاک شد');
    expect(await subscribers.listLastBlast('bale')).toEqual([]);
  });

  it('Should tell the admin when there is nothing to unsend', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/unsend',
        from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
        chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
      },
    });

    expect(sent.at(-1)?.text).toContain('نیست');
  });

  it('Should ignore /unsend from anyone but the admin', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/unsend',
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent).toEqual([]);
  });
});

describe('Bale webhook — delete room', () => {
  it('Should destroy a live room when the admin types /delete CODE', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app, repo } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const entry = repo.create({ name: 'Friday' });
    const code = entry.room.code;

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: `/delete ${code}`,
        from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
        chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent[0]?.text).toContain(code);
    expect(sent[0]?.text).toContain('پاک شد');
    expect(repo.getByCode(code)).toBeUndefined();
  });

  it('Should tell the admin when the code is missing or unknown', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });

    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: '/delete',
        from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
        chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
      },
    });
    await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 2,
      message: {
        message_id: 2,
        date: 0,
        text: '/delete ZZZZZZ',
        from: { id: DEFAULT_ADMIN_USER_ID, is_bot: false, first_name: 'Admin' },
        chat: { id: DEFAULT_ADMIN_USER_ID, type: 'private' },
      },
    });

    expect(sent[0]?.text).toContain('/delete');
    expect(sent[1]?.text).toContain('پیدا نشد');
  });

  it('Should ignore /delete from anyone but the admin', async () => {
    const sent: Array<{ text: string }> = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push(params);
        return {};
      },
    };
    const { app, repo } = await buildServer({
      bale: {
        bot,
        botToken: TOKEN,
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    const entry = repo.create({ name: 'Friday' });
    const code = entry.room.code;

    const { status } = await httpJson(app, 'POST', '/api/bale/webhook', {
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        text: `/delete ${code}`,
        from: { id: 9, is_bot: false, first_name: 'Ana' },
        chat: { id: 9, type: 'private' },
      },
    });

    expect(status).toBe(200);
    expect(sent).toEqual([]);
    expect(repo.getByCode(code)).toBeDefined();
  });
});
