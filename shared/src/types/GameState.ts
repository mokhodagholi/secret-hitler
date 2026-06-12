// Pure data types shared by client and server. No runtime dependencies —
// this module is bundled into the browser, so it must never import `ws`,
// `node:*`, or anything server-only.

export type Role = 'liberal' | 'fascist' | 'hitler';

export type Faction = 'liberal' | 'fascist';

export type Policy = 'liberal' | 'fascist';

export type Vote = 'ja' | 'nein';

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
  showRoles: boolean;
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

export interface LogEntry {
  id: string;
  text: string;
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
  /** Whose turn it is to talk, and when their window closes (epoch ms). */
  speaker: { playerId: string; startedAt: number; endsAt: number } | null;
  /** Private data for the recipient only. */
  you: {
    id: string;
    role: Role | null;
    vote: Vote | null;
    /** Policies in your hand if you're the active legislator, else empty. */
    policies: Policy[];
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
/** How long each player holds the talking stick, in ms. */
export const SPEAKING_TURN_MS = 20_000;
