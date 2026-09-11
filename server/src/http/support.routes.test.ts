import { createHmac } from 'node:crypto';
import { describe, expect, it } from '@rstest/core';
import { buildServer } from '../app';
import { httpJson } from '../../test/test-utils';
import { BaleSeatIndex } from '../bale/BaleSeatIndex';
import type { BaleMessenger } from '../bale/webhook';

const TOKEN = '123456:test-token';
const CLIENT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function sign(fields: Record<string, string>, token = TOKEN): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

function stubBale(
  sent: Array<{ chat_id: number | string; text: string }>,
  supportChatId: number | string | null = -1001,
) {
  const bot: BaleMessenger = {
    sendMessage: async (params) => {
      sent.push({ chat_id: params.chat_id, text: params.text });
      return {};
    },
  };
  return {
    bot,
    botToken: TOKEN,
    botUsername: '@secret_hitler_bot',
    seats: new BaleSeatIndex(),
    supportChatId: supportChatId ?? undefined,
  };
}

describe('support HTTP endpoint', () => {
  it('Should post a letter to the support group with the client id', async () => {
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const { app } = await buildServer({ bale: stubBale(sent) });

    const { status, body } = await httpJson<{ ok: boolean }>(app, 'POST', '/api/support', {
      topic: 'suggestion',
      description: 'add a veto hint',
      clientId: CLIENT_ID,
    });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].chat_id).toBe(-1001);
    expect(sent[0].text).toContain('پیشنهاد');
    expect(sent[0].text).toContain(CLIENT_ID);
    expect(sent[0].text).toContain('add a veto hint');
  });

  it('Should stamp the Bale user id when initData is valid', async () => {
    const sent: Array<{ chat_id: number | string; text: string }> = [];
    const { app } = await buildServer({ bale: stubBale(sent) });
    const initData = sign({
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 42, first_name: 'Ana' }),
    });

    const { status } = await httpJson(app, 'POST', '/api/support', {
      topic: 'help',
      description: 'the table froze',
      clientId: CLIENT_ID,
      initData,
    });

    expect(status).toBe(200);
    expect(sent[0].text).toContain('فرستنده: 42');
    expect(sent[0].text).not.toContain(CLIENT_ID);
  });

  it('Should reject an unknown topic or a blank letter', async () => {
    const { app } = await buildServer({ bale: stubBale([]) });
    expect(
      (await httpJson(app, 'POST', '/api/support', { topic: 'other', description: 'hello there', clientId: CLIENT_ID }))
        .status,
    ).toBe(400);
    expect(
      (await httpJson(app, 'POST', '/api/support', { topic: 'help', description: '  ', clientId: CLIENT_ID })).status,
    ).toBe(400);
  });

  it('Should refuse letters when the support group is not configured', async () => {
    const { app } = await buildServer({ bale: stubBale([], null) });
    const { status, body } = await httpJson<{ code: string }>(app, 'POST', '/api/support', {
      topic: 'help',
      description: 'the table froze',
      clientId: CLIENT_ID,
    });
    expect(status).toBe(503);
    expect(body.code).toBe('SUPPORT_DISABLED');
  });

  it('Should rate-limit letters per address', async () => {
    const { app } = await buildServer({ bale: stubBale([]) });
    for (let i = 0; i < 3; i++) {
      expect(
        (
          await httpJson(app, 'POST', '/api/support', {
            topic: 'criticism',
            description: `letter number ${i} is long enough`,
            clientId: CLIENT_ID,
          })
        ).status,
      ).toBe(200);
    }
    const throttled = await httpJson<{ code: string }>(app, 'POST', '/api/support', {
      topic: 'help',
      description: 'one more than the budget',
      clientId: CLIENT_ID,
    });
    expect(throttled.status).toBe(429);
    expect(throttled.body.code).toBe('RATE_LIMITED');
  });
});
