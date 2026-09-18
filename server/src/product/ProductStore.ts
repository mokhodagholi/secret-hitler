import type { MessengerKind } from '@secret-hitler/shared';

export const PRODUCT_EVENT_NAMES = [
  'bot_start',
  'miniapp_auth',
  'find_match',
  'room_create',
  'room_join',
  'group_create',
  'seated',
  'table_dealt',
  'game_finished',
  'lobby_died',
  'game_abandoned',
  'lobby_fill_invite',
  'lobby_fill_fail',
  'lobby_fill_wave',
  'own_room_prompt',
  'own_room_want',
  'lobby_nudge_prompt',
  'lobby_nudge_join',
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export type ProductPlatform = MessengerKind | 'browser';

export type LobbySource = 'public' | 'hosted' | 'group';

export type LobbyDeathReason = 'host_left' | 'never_started' | 'afk_kick';

export type MatchOutcome =
  | 'liberal_policy'
  | 'hitler_executed'
  | 'fascist_policy'
  | 'hitler_elected'
  | 'fascist_numbers'
  | 'abandoned';

export interface ProductEvent {
  name: ProductEventName;
  at: Date;
  platform?: ProductPlatform | null;
  userKey?: string | null;
  roomCode?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface ProductLobby {
  roomCode: string;
  source: LobbySource;
  openedAt: Date;
  hourIran: number;
  peakSeats: number;
  reached5At: Date | null;
  dealtAt: Date | null;
  diedAt: Date | null;
  deathReason: LobbyDeathReason | null;
  afkKicks: number;
}

export interface ProductMatch {
  roomCode: string;
  startedAt: Date;
  endedAt: Date | null;
  outcome: MatchOutcome | null;
  disconnects: number;
  kickVotes: number;
  afkKicks: number;
}

export interface ProductBlast {
  id: string;
  platform: MessengerKind;
  sentAt: Date;
  reached: number;
  recipients: ProductBlastRecipient[];
}

export interface ProductBlastRecipient {
  chatId: string;
  openedAt: Date | null;
  satAt: Date | null;
}

/**
 * Persistence for product funnel, lobby fill, blast conversion, and match
 * health. Production uses Postgres; tests inject the in-memory store.
 */
export interface WarmInviteQuery {
  platform: MessengerKind;
  now: Date;
  /** Prefer activity inside this lookback (default 6h). */
  warmWindowMs: number;
  /** Skip anyone who finished a game this recently (default 30m). */
  postGameCooldownMs: number;
  /** Skip anyone who already got a fill invite this recently (default 12h). */
  inviteCooldownMs: number;
  excludeUserKeys: ReadonlySet<string>;
  limit: number;
}

export interface ProductStore {
  recordEvent(event: ProductEvent): Promise<void>;
  openLobby(lobby: {
    roomCode: string;
    source: LobbySource;
    openedAt: Date;
    hourIran: number;
    seats: number;
  }): Promise<void>;
  touchLobby(roomCode: string, seats: number, at: Date): Promise<void>;
  markLobbyDealt(roomCode: string, at: Date): Promise<void>;
  closeLobby(roomCode: string, reason: LobbyDeathReason, at: Date): Promise<boolean>;
  incrementLobbyAfkKicks(roomCode: string, count: number): Promise<void>;
  startMatch(roomCode: string, at: Date): Promise<void>;
  incrementMatchDisconnects(roomCode: string): Promise<void>;
  incrementMatchKickVotes(roomCode: string): Promise<void>;
  incrementMatchAfkKicks(roomCode: string, count: number): Promise<void>;
  finishMatch(roomCode: string, outcome: MatchOutcome, at: Date): Promise<void>;
  abandonMatch(roomCode: string, at: Date): Promise<boolean>;
  recordBlast(platform: MessengerKind, chatIds: string[], sentAt: Date): Promise<void>;
  markBlastOpened(platform: MessengerKind, chatId: string, at: Date): Promise<void>;
  markBlastSat(platform: MessengerKind, chatId: string, at: Date): Promise<void>;
  /**
   * Warm messenger users for lobby-fill DMs: recent mini-app / sit / find-match,
   * not post-game exhausted, not invite-cooled, not in `excludeUserKeys`.
   */
  listWarmInviteTargets(query: WarmInviteQuery): Promise<string[]>;
  /**
   * Aggregate funnel / lobby / fill / match / social-accept rows from `from`
   * (scoreboard lookback) until `to`. Caller supplies `liveRooms` when
   * formatting the support-group digest.
   */
  summarizeDigestWindow(from: Date, to: Date): Promise<DigestWindowTotals>;
  close(): Promise<void>;
}

/** One accepted friend request / table invite, for the Iran-day scoreboard. */
export interface DigestSocialAccept {
  resolvedAt: Date;
}

/** Counts for {@link summarizeProductDigest} without live-room / clock fields. */
export interface DigestWindowTotals {
  events: ProductEvent[];
  lobbies: ProductLobby[];
  matches: ProductMatch[];
  friendAccepts: DigestSocialAccept[];
  tableInviteAccepts: DigestSocialAccept[];
}

export const BLAST_RETURN_WINDOW_MS = 24 * 60 * 60 * 1000;
