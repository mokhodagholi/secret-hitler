import { describe, expect, it } from '@rstest/core';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';
import { BaleSeatIndex } from './BaleSeatIndex';
import {
  webhookListenUrl,
  webhookSecretMatches,
  type BaleMessenger,
} from './webhook';

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
    expect(JSON.stringify(sent[0])).not.toContain('mrfantastic');
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
