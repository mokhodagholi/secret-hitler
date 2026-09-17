import { describe, expect, it } from '@rstest/core';
import { BaleSeatIndex } from '../bale/BaleSeatIndex';
import type { BaleRuntime } from '../bale/webhook';
import { RoomRepository } from '../rooms/RoomRepository';
import { InMemoryProductStore } from './InMemoryProductStore';
import { PRODUCT_DIGEST } from './productDigest';
import { ProductDigestService } from './ProductDigestService';

function stubRuntime(
  kind: 'bale' | 'telegram',
  supportChatId: number,
  sendMessage: BaleRuntime['bot']['sendMessage'],
): BaleRuntime {
  return {
    kind,
    bot: { sendMessage } as BaleRuntime['bot'],
    botToken: 'test',
    botUsername: 'test_bot',
    seats: new BaleSeatIndex(),
    supportChatId,
  };
}

describe('ProductDigestService', () => {
  it('Should post a formatted digest to every support desk', async () => {
    const product = new InMemoryProductStore();
    const from = new Date(Date.now() - PRODUCT_DIGEST.intervalMs + 60_000);
    await product.recordEvent({
      name: 'miniapp_auth',
      at: from,
      userKey: 'bale:1',
      platform: 'bale',
    });

    const sent: { chat_id: number | string; text: string }[] = [];
    const sendMessage: BaleRuntime['bot']['sendMessage'] = async (payload) => {
      sent.push(payload);
      return { ok: true, result: { message_id: 1 } };
    };

    const service = new ProductDigestService({
      product,
      repo: new RoomRepository(),
      bale: stubRuntime('bale', -1001, sendMessage),
      telegram: stubRuntime('telegram', -1002, sendMessage),
    });

    const text = await service.postWindow(new Date());
    expect(text).toContain('مینی‌اپ: 1');
    expect(sent).toHaveLength(2);
    expect(sent.map((row) => row.chat_id)).toEqual(expect.arrayContaining([-1001, -1002]));
  });

  it('Should no-op when no support chat is configured', async () => {
    const service = new ProductDigestService({
      product: new InMemoryProductStore(),
      repo: new RoomRepository(),
    });
    expect(await service.postWindow(new Date())).toBeNull();
  });
});
