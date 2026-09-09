// Pure data types shared by client and server. No runtime dependencies —
// this module is bundled into the browser, so it must never import `ws`,
// `node:*`, or anything server-only.

export type Role = 'liberal' | 'fascist' | 'hitler';

export type Faction = 'liberal' | 'fascist';

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
  isAlive: boolean;
  /** Secret role — never broadcast to other players. */
  role: Role | null;
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
  isAlive: boolean;
  isPresident: boolean;
  isChancellor: boolean;
  /** Has cast a vote this election (the vote itself stays secret). */
  hasVoted: boolean;
  /** Revealed role, or null when still hidden to the viewer. */
  role: Role | null;
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
  | 'hitlerExecuted';

export interface LogEntry {
  id: string;
  code: LogCode;
  /** Player names / counts substituted into the localized template. */
  params?: Record<string, string | number>;
  at: number;
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
  players: PublicPlayer[];
  board: BoardState;
  /** Winning faction once the game is over, else null. */
  winner: Faction | null;
  /** Open discussion window (epoch ms) before the President nominates, else null. */
  discussionDeadline: { startedAt: number; endsAt: number } | null;
  /** Active vote window (epoch ms) during the Voting phase, else null. */
  voteDeadline: { startedAt: number; endsAt: number } | null;
  /** Active legislative window (epoch ms) while a legislator chooses, else null. */
  legislativeDeadline: { startedAt: number; endsAt: number } | null;
  /** Active nomination window (epoch ms) while the President nominates, else null. */
  nominationDeadline: { startedAt: number; endsAt: number } | null;
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
}

/** Standard minimum for real games; dev servers may lower the effective value. */
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;
/** Lowest count the role distribution supports — the dev floor. */
export const SUPPORTED_MIN_PLAYERS = 3;
/** Open discussion window each round before nomination — everyone may chat. */
export const DISCUSSION_DURATION_MS = 180_000;
/** How long the Ja/Nein vote stays open before unvoted players default to Nein. */
export const VOTE_DURATION_MS = 30_000;
/** How long a legislator has to choose before the engine picks at random. */
export const LEGISLATIVE_DURATION_MS = 20_000;
/** How long the President has to nominate before the election fails. */
export const NOMINATION_DURATION_MS = 10_000;
/** How long a disconnected host keeps the host seat before migration, in ms. */
export const HOST_MIGRATION_GRACE_MS = 30_000;
