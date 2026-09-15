import type { MessengerKind } from '@secret-hitler/shared';

/**
 * People who opened a private chat with the bot. Production uses Postgres;
 * tests inject the in-memory store.
 */
export interface BotSubscriberStore {
  upsert(platform: MessengerKind, chatId: string): Promise<void>;
  list(platform: MessengerKind): Promise<string[]>;
  remove(platform: MessengerKind, chatId: string): Promise<void>;
  close(): Promise<void>;
}
