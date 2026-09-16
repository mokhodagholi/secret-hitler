import type { MessengerKind } from '@secret-hitler/shared';

export interface BotBlastDelivery {
  chatId: string;
  messageId: number;
}

/**
 * People who opened a private chat with the bot. Production uses Postgres;
 * tests inject the in-memory store.
 */
export interface BotSubscriberStore {
  /** True when this chat was not already on the list. */
  upsert(platform: MessengerKind, chatId: string): Promise<boolean>;
  list(platform: MessengerKind): Promise<string[]>;
  remove(platform: MessengerKind, chatId: string): Promise<void>;
  /** Last /broadcast or /message DMs, so /unsend can delete them. */
  replaceLastBlast(platform: MessengerKind, deliveries: BotBlastDelivery[]): Promise<void>;
  listLastBlast(platform: MessengerKind): Promise<BotBlastDelivery[]>;
  close(): Promise<void>;
}
