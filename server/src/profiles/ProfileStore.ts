/** Identity used to store a chosen player card. */
export interface ProfileIdentity {
  clientId?: string;
  baleUserId?: string;
}

/**
 * Persistence for the illustrated player card. Production uses Postgres;
 * tests inject the in-memory store.
 */
export interface ProfileStore {
  upsert(identity: ProfileIdentity, avatar: number): Promise<number>;
  get(identity: ProfileIdentity): Promise<number | null>;
  close(): Promise<void>;
}
