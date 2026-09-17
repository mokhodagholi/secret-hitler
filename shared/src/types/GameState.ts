// Pure data types shared by client and server. No runtime dependencies —
// this module is bundled into the browser, so it must never import `ws`,
// `node:*`, or anything server-only.

/** Messenger that signed mini-app login. Numeric user ids are namespaced by this. */
export type MessengerKind = 'bale' | 'telegram';

export type Role = 'liberal' | 'fascist' | 'hitler';

export type Faction = 'liberal' | 'fascist';

/** Party membership Investigate reveals. Hitler's card reads Fascist. */
export function partyOf(role: Role | null | undefined): Faction | null {
  if (role == null) return null;
  return role === 'liberal' ? 'liberal' : 'fascist';
}

export type Policy = 'liberal' | 'fascist';

export type Vote = 'ja' | 'nein';

/** Executive power a fascist policy can grant the President. */
export type ExecutivePower =
  | 'investigate'
  | 'specialElection'
  | 'policyPeek'
  | 'execution';

export enum Phase {
  Lobby = 'lobby',
  Nomination = 'nomination',
  Voting = 'voting',
  PresidentLegislative = 'presidentLegislative',
  ChancellorLegislative = 'chancellorLegislative',
  SpecialPower = 'specialPower',
  GameOver = 'gameOver',
}

export interface RoomOptions {
  name: string;
  hasPassword: boolean;
  /** Min players to start. Standard 5; a dev server may lower it. */
  minPlayers: number;
  maxPlayers: number;
  timerEnabled: boolean;
  confirmActions: boolean;
  /**
   * Group this table was opened from (`/create`). Members of that chat
   * skip the password; everyone else still types it. Scoped to
   * {@link originPlatform} so a Telegram user is not a Bale group member.
   */
  originChatId?: number;
  /** Which bot owns {@link originChatId}. Omitted on restored Bale rooms means Bale. */
  originPlatform?: MessengerKind;
  /** Group `/create` post — rewritten when the host leaves. */
  originMessageId?: number;
  /** Evergreen Join lobby. First sitter is host. Absent means hosted. */
  kind?: 'public';
  /** Bale/Telegram user who opened this table with `/play-game`. Hidden from public lists. */
  adminPlayUserId?: number;
  /**
   * When true, Ravi prompt holds, deal/pass flight delays, and announce
   * breaths collapse to 0 so unit tests can act immediately. Production
   * rooms omit this (false).
   */
  skipCeremony?: boolean;
}

/** Stored name for the evergreen lobby; UIs localize via `kind`. */
export const PUBLIC_TABLE_NAME = 'میز عمومی';
/** Public salon seats; same cap as a hosted table (`MAX_PLAYERS`). */
export const PUBLIC_TABLE_MAX_PLAYERS = 10;

export function isPublicTable(options: Pick<RoomOptions, 'kind'>): boolean {
  return options.kind === 'public';
}

/** Internal, authoritative player record kept on the server. */
export interface Player {
  id: string;
  name: string;
  avatar: number;
  seat: number;
  isHost: boolean;
  connected: boolean;
  ready: boolean;
  /** Public-table Accept leftover; salon start is host Start. Hosted rooms leave this false. */
  wantsStart: boolean;
  /** Last public Accept tap; unused for collecting Start (there is none). */
  wantStartAt: number | null;
  /** Lobby clock for the 5-minute idle kick; null while engaged or offline. */
  unreadySince: number | null;
  /**
   * Stable sit identity (`bale:`, `telegram:`, or `client:`) used to keep an
   * in-game kicked player off this room. Never shown to other sitters.
   */
  joinKey: string | null;
  isAlive: boolean;
  /** Secret role — never broadcast to other players. */
  role: Role | null;
  /** Game-over: this seat wants another round in the same room. */
  wantsContinue: boolean;
}

/** Player fields safe to broadcast to everyone in the room. */
export interface PublicPlayer {
  id: string;
  name: string;
  avatar: number;
  seat: number;
  isHost: boolean;
  connected: boolean;
  ready: boolean;
  wantsStart: boolean;
  isAlive: boolean;
  isPresident: boolean;
  isChancellor: boolean;
  /** Has cast a vote this election (the vote itself stays secret while voting). */
  hasVoted: boolean;
  /** Ja/Nein once the election is public; null while the vote is secret. */
  vote: Vote | null;
  /** Game-over: this seat has chosen to stay for another round. */
  wantsContinue: boolean;
  /** Revealed role, or null when still hidden to the viewer. */
  role: Role | null;
  /**
   * Party membership this viewer has learned (Investigate). Null when they
   * have not checked this player — never the secret role, and Hitler reads
   * Fascist.
   */
  party: Faction | null;
  /** Their mic is off for the whole table (self-mute). */
  selfMuted: boolean;
}

/** Policy board / election state surfaced to all clients. */
export interface BoardState {
  liberalPolicies: number;
  fascistPolicies: number;
  electionTracker: number;
  drawPile: number;
  discardPile: number;
  president: string | null;
  chancellor: string | null;
  lastEnacted: Policy[];
}

export interface ChatMessage {
  id: string;
  playerId: string;
  name: string;
  text: string;
  at: number;
}

/** A localizable game-report line. The client formats `log.<code>` with
 *  `params` so the report follows each viewer's language. */
export type LogCode =
  | 'joined'
  | 'left'
  | 'kicked'
  | 'reconnected'
  | 'disconnected'
  | 'gameStarted'
  | 'liberalsWin'
  | 'fascistsWin'
  | 'fascistsWinNumbers'
  | 'chaos'
  | 'newHost'
  | 'nominated'
  | 'votePassed'
  | 'voteFailed'
  | 'hitlerChancellor'
  | 'governmentElected'
  | 'presidentDraws'
  | 'presidentPasses'
  | 'liberalEnacted'
  | 'fascistEnacted'
  | 'vetoProposed'
  | 'vetoRejected'
  | 'vetoAgreed'
  | 'investigated'
  | 'executed'
  | 'hitlerExecuted'
  | 'presidentVacated'
  | 'chancellorVacated'
  | 'kickVoteStarted'
  | 'kickVotePassed'
  | 'kickVoteFailed';

export interface LogEntry {
  id: string;
  code: LogCode;
  /** Player names / counts substituted into the localized template. */
  params?: Record<string, string | number>;
  at: number;
}

/** One seat's ballot after a government vote closed (missing taps count as Nein). */
export interface RoundHistoryBallot {
  playerId: string;
  name: string;
  vote: Vote;
  /** True when the engine filled Nein because they never cast. */
  abstained: boolean;
}

/** Executive power recorded on a finished round. Party / peek colours stay private. */
export interface RoundHistoryPower {
  kind: ExecutivePower;
  targetId: string | null;
  targetName: string | null;
}

/**
 * One completed (or in-progress draft) government cycle for the in-match
 * history sheet. Ballots match what seats briefly show after the vote closes.
 */
export interface RoundHistoryEntry {
  round: number;
  presidentId: string;
  presidentName: string;
  chancellorId: string | null;
  chancellorName: string | null;
  /** Null until a government was put to a vote. */
  ballots: RoundHistoryBallot[] | null;
  ja: number | null;
  nein: number | null;
  /** Null if no vote; false if rejected; true if the government formed. */
  elected: boolean | null;
  /** President never named a Chancellor before the nomination window closed. */
  nominationFailed: boolean;
  vetoAgreed: boolean;
  chaos: boolean;
  enacted: Policy | null;
  power: RoundHistoryPower | null;
}

/** Deferred hand-off while Ravi / ceremony announces the last beat. */
export type BreathAction =
  | { kind: 'advanceRound' }
  | { kind: 'grantPower'; power: ExecutivePower }
  | { kind: 'startSpecialElection'; playerId: string };

export interface PendingBreath {
  startedAt: number;
  endsAt: number;
  action: BreathAction;
}

/** Public snapshot of an in-progress vote to remove a player. */
export interface KickVoteView {
  requesterId: string;
  targetId: string;
  startedAt: number;
  endsAt: number;
  votedCount: number;
  voterCount: number;
  needed: number;
  yourVote: boolean | null;
  votedIds: string[];
}

/** Per-viewer snapshot broadcast on every state change. */
export interface GameStateView {
  roomId: string;
  code: string;
  name: string;
  phase: Phase;
  hostId: string;
  minPlayers: number;
  maxPlayers: number;
  /** Reserved Find Match table when `public`. */
  kind: 'public' | 'hosted';
  /** Hidden admin `/play-game` table — local DEV can skip clocks and mirror votes. */
  adminPlay: boolean;
  /** Public-table must-choose window, else null. */
  startChoice: { startedAt: number; endsAt: number } | null;
  players: PublicPlayer[];
  board: BoardState;
  /** Winning faction once the game is over, else null. */
  winner: Faction | null;
  /** Finished rounds for the in-match history sheet (oldest first). */
  roundHistory: RoundHistoryEntry[];
  /** Announce breath before the next phase hand-off, else null. */
  breathDeadline: { startedAt: number; endsAt: number } | null;
  /** Open discussion window (epoch ms) before the President nominates, else null. */
  discussionDeadline: { startedAt: number; endsAt: number } | null;
  /** Active vote window (epoch ms) during the Voting phase, else null. */
  voteDeadline: { startedAt: number; endsAt: number } | null;
  /** Active legislative window (epoch ms) while a legislator chooses, else null. */
  legislativeDeadline: { startedAt: number; endsAt: number } | null;
  /** Active nomination window (epoch ms) while the President nominates, else null. */
  nominationDeadline: { startedAt: number; endsAt: number } | null;
  /** Active executive-power window (epoch ms) while the President acts, else null. */
  specialPowerDeadline: { startedAt: number; endsAt: number } | null;
  /** Open table vote to remove a player. Game clocks are frozen while set. */
  kickVote: KickVoteView | null;
  /** Player ids that may not be nominated as Chancellor (term limits). */
  ineligibleChancellors: string[];
  /** The power the President must use during the SpecialPower phase, else null. */
  activePower: ExecutivePower | null;
  /** Veto is available (5 fascist policies enacted). */
  vetoUnlocked: boolean;
  /** The Chancellor has proposed a veto, awaiting the President's consent. */
  vetoRequested: boolean;
  /** Private data for the recipient only. */
  you: {
    id: string;
    role: Role | null;
    vote: Vote | null;
    /** Policies in your hand if you're the active legislator, else empty. */
    policies: Policy[];
    /** Top three policies, shown only to the President during Policy Peek. */
    peek: Policy[];
    /** Investigation result, shown only to the President after investigating. */
    investigation: { name: string; party: Faction } | null;
    /** False after this viewer asked the table to remove someone, until that kick passes. */
    canRequestKick: boolean;
    /** Epoch ms when this viewer may tap Start again; null when no cooldown. */
    wantStartCooldownUntil: number | null;
  };
}

/** Lightweight room descriptor for the public room list. */
export interface RoomSummary {
  id: string;
  code: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  phase: Phase;
  /** Set on the evergreen Join lobby so lists can pin it. */
  kind?: 'public';
}

/** Standard minimum for real games; dev servers may lower the effective value. */
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;
/** Lowest count the role distribution supports — the dev floor. */
export const SUPPORTED_MIN_PLAYERS = 3;
/** Open discussion window each round before nomination — everyone may chat. */
export const DISCUSSION_DURATION_MS = 180_000;
/** How long the Ja/Nein vote stays open before unvoted players default to Nein. */
export const VOTE_DURATION_MS = 45_000;
/** How long a legislator has to choose before the engine picks at random. */
export const LEGISLATIVE_DURATION_MS = 35_000;
/** One face-down policy flying from the pile or a seat to the table. */
export const LEGISLATIVE_TRAVEL_CARD_MS = 780;
/** President deal: three cards leave the draw pile before the choice clock starts. */
export const LEGISLATIVE_DEAL_MS = 100 + 3 * LEGISLATIVE_TRAVEL_CARD_MS;
/** Chancellor pass: two cards travel before the choice clock starts. */
export const LEGISLATIVE_PASS_MS = 100 + 2 * LEGISLATIVE_TRAVEL_CARD_MS;
/** How long the President has to nominate before the election fails. */
export const NOMINATION_DURATION_MS = 40_000;
/** How long the President has to use an executive power (pick a target / peek). */
export const SPECIAL_POWER_DURATION_MS = 30_000;
/** After an investigate reveal, hold this long before the next round. */
export const INVESTIGATION_HOLD_MS = 10_000;

/**
 * Public announce breaths — sized so Ravi’s mid-game lines can finish before
 * the next decision clock / UI. Opening night already waits on clip length;
 * these cover the rest of the table.
 */
/** vote.passed (~2.2s) before policies fly; stacks with {@link LEGISLATIVE_DEAL_MS}. */
export const BREATH_AFTER_VOTE_MS = 4_000;
/** law.liberal / law.fascist (~2.5–2.9s) before the next round or power UI. */
export const BREATH_AFTER_LAW_MS = 3_500;
/** vote.failed + tracker.advance (~5s) before the next discussion. */
export const BREATH_AFTER_FAIL_MS = 5_500;
/** chaos.start + chaos.enacted (~12s) before the next discussion. */
export const BREATH_AFTER_CHAOS_MS = 13_000;
/** Power resolve / special-election announce (~3s) before the next round. */
export const BREATH_AFTER_POWER_MS = 3_500;

/** How long a table kick vote stays open before it is counted as-is. */
export const KICK_VOTE_DURATION_MS = 30_000;
/** Public-table holdouts must Accept before this, or they are kicked. */
export const START_CHOICE_DURATION_MS = 15_000;
/** Kept on the snapshot; collecting Start no longer exists on the public table. */
export const WANT_START_COOLDOWN_MS = 3 * 60_000;
/** Lobby: connected and idle this long (non-host) → kicked as away. */
export const LOBBY_AFK_MS = 5 * 60_000;
/** Lobby: disconnected this long without a reconnect → seat dropped, not banned. */
export const LOBBY_DISCONNECT_MS = 15_000;
/**
 * No WebSocket traffic this long → server terminates the socket.
 * Client pings every 25s; this is one miss plus slack so a silent phone
 * drop still runs the lobby disconnect kick.
 */
export const WS_IDLE_MS = 40_000;
/** How often the server looks for idle sockets. */
export const WS_IDLE_CHECK_MS = 10_000;
/** Pause between a player's table-chat messages — one line, then wait. */
export const CHAT_SLOWMODE_MS = 2_000;

/** Yes votes needed to remove a player — half the living table, rounded up. */
export function kickVoteYesNeeded(livingCount: number): number {
  return Math.ceil(livingCount / 2);
}
/** How long a disconnected host keeps the host seat before migration, in ms. */
export const HOST_MIGRATION_GRACE_MS = 30_000;

/** After a process restart, keep an in-progress match until clients reconnect. */
export const LIVE_ROOM_RECONNECT_GRACE_MS = 5 * 60_000;

/** Opening night: face-down cards fly to every seat. */
export const OPENING_DEAL_MS = 10_000;
/** Hold after the longest spoken beat so every seat lifts night together. */
export const OPENING_NIGHT_PAD_MS = 2_000;
/** Private look — longest pair: night.start (2.14s) + youFascist (12.70s). */
export const OPENING_LOOK_MS = 2_140 + 12_700 + OPENING_NIGHT_PAD_MS;
/** Glance — longest teammate line: nightFascistLarge (5.98s). */
export const OPENING_GLANCE_MS = 5_980 + OPENING_NIGHT_PAD_MS;
/** Full opening ceremony. Chat and the first President stay hidden until this elapses. */
export const OPENING_CEREMONY_MS =
  OPENING_DEAL_MS + OPENING_LOOK_MS + OPENING_GLANCE_MS;

/** True during the first-round deal / night / glance, before day begins. */
export function isOpeningNight(state: {
  phase: Phase;
  discussionStartedAt: number;
  liberalPolicies: number;
  fascistPolicies: number;
  electionTracker: number;
  now?: number;
}): boolean {
  const now = state.now ?? Date.now();
  return (
    state.phase === Phase.Nomination &&
    state.discussionStartedAt > 0 &&
    now - state.discussionStartedAt < OPENING_CEREMONY_MS &&
    state.liberalPolicies === 0 &&
    state.fascistPolicies === 0 &&
    state.electionTracker === 0
  );
}
