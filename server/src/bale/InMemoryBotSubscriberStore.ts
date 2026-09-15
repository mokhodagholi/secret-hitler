import type { MessengerKind } from '@secret-hitler/shared';
import type { BotBlastDelivery, BotSubscriberStore } from './BotSubscriberStore';

/** Non-persistent {@link BotSubscriberStore} for tests. */
export class InMemoryBotSubscriberStore implements BotSubscriberStore {
  private readonly keys = new Set<string>();
  private readonly blasts = new Map<MessengerKind, BotBlastDelivery[]>();

  async upsert(platform: MessengerKind, chatId: string): Promise<void> {
    if (!chatId) return;
    this.keys.add(`${platform}:${chatId}`);
  }

  async list(platform: MessengerKind): Promise<string[]> {
    const prefix = `${platform}:`;
    return [...this.keys]
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length));
  }

  async remove(platform: MessengerKind, chatId: string): Promise<void> {
    this.keys.delete(`${platform}:${chatId}`);
  }

  async replaceLastBlast(platform: MessengerKind, deliveries: BotBlastDelivery[]): Promise<void> {
    this.blasts.set(platform, deliveries.map((row) => ({ ...row })));
  }

  async listLastBlast(platform: MessengerKind): Promise<BotBlastDelivery[]> {
    return (this.blasts.get(platform) ?? []).map((row) => ({ ...row }));
  }

  async close(): Promise<void> {}
}
