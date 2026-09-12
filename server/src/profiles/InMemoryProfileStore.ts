import type { ProfileIdentity, ProfileStore } from './ProfileStore';

/**
 * Non-persistent {@link ProfileStore} for tests. Messenger id wins on read when
 * both keys are present.
 */
export class InMemoryProfileStore implements ProfileStore {
  private readonly byClient = new Map<string, number>();
  private readonly byBale = new Map<string, number>();
  private readonly byTelegram = new Map<string, number>();

  async upsert(identity: ProfileIdentity, avatar: number): Promise<number> {
    if (!identity.clientId) {
      throw new Error('clientId is required to save a profile');
    }
    this.byClient.set(identity.clientId, avatar);
    if (identity.baleUserId) this.byBale.set(identity.baleUserId, avatar);
    if (identity.telegramUserId) this.byTelegram.set(identity.telegramUserId, avatar);
    return avatar;
  }

  async get(identity: ProfileIdentity): Promise<number | null> {
    if (identity.telegramUserId) {
      const fromTelegram = this.byTelegram.get(identity.telegramUserId);
      if (fromTelegram != null) return fromTelegram;
    }
    if (identity.baleUserId) {
      const fromBale = this.byBale.get(identity.baleUserId);
      if (fromBale != null) return fromBale;
    }
    if (!identity.clientId) return null;
    return this.byClient.get(identity.clientId) ?? null;
  }

  async close(): Promise<void> {}
}
