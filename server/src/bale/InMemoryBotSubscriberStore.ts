import type { MessengerKind } from '@secret-hitler/shared';
import type { BotSubscriberStore } from './BotSubscriberStore';

/** Non-persistent {@link BotSubscriberStore} for tests. */
export class InMemoryBotSubscriberStore implements BotSubscriberStore {
  private readonly keys = new Set<string>();

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

  async close(): Promise<void> {}
}
