import { describe, expect, it } from '@rstest/core';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';
import { BaleSeatIndex } from './BaleSeatIndex';
import type { BaleMessenger } from './webhook';

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
    expect(sent[0].text).toContain('هیتلر مخفی');
    expect(JSON.stringify(sent[0].reply_markup)).toContain(
      'https://ble.ir/@secret_hitler_bot?start=',
    );
    expect(JSON.stringify(sent[0])).not.toContain('mrfantastic');
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
