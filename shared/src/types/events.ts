// WebSocket message contracts. Both client and server import these so the
// wire format stays in sync. All messages are tagged by `type` for
// discriminated-union narrowing.

import type {
  ChatMessage,
  GameStateView,
  LogEntry,
  Role,
  Vote,
} from './GameState';

// ---------------------------------------------------------------------------
// In-game command payloads (envelope is `{ type: 'command', command: ... }`).
// The legislative/voting commands are wired once the game engine lands; their
// shapes are fixed here so client and server agree ahead of time.
// ---------------------------------------------------------------------------

export type GameCommand =
  | { kind: 'nominateChancellor'; targetId: string }
  | { kind: 'castVote'; vote: Vote }
  | { kind: 'discardPolicy'; index: number }
  | { kind: 'enactPolicy'; index: number }
  | { kind: 'useSpecialPower'; targetId: string }
  | { kind: 'vetoRequest' };

// ---------------------------------------------------------------------------
// Client -> Server
// ---------------------------------------------------------------------------

export type ClientMessage =
  /** First message after the socket opens; authenticates via join token. */
  | { type: 'auth'; token: string }
  | { type: 'player:ready' }
  | { type: 'player:unready' }
  | { type: 'game:start' }
  | { type: 'chat:message'; text: string }
  | { type: 'command'; command: GameCommand }
  | { type: 'ping' };

// ---------------------------------------------------------------------------
// Server -> Client
// ---------------------------------------------------------------------------

export type ServerErrorCode =
  | 'AUTH_FAILED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'WRONG_PASSWORD'
  | 'ALREADY_STARTED'
  | 'NAME_TAKEN'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'INVALID_ACTION';

export type ServerMessage =
  /** Sent once after a successful auth handshake. */
  | { type: 'authed'; playerId: string }
  /** Full per-viewer state snapshot — sent on every change. */
  | { type: 'state'; state: GameStateView }
  /** Private role/hand reveal for the recipient only. */
  | { type: 'private'; role: Role }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'log'; entry: LogEntry }
  | { type: 'error'; code: ServerErrorCode; message: string }
  | { type: 'pong' };

// ---------------------------------------------------------------------------
// HTTP DTOs
// ---------------------------------------------------------------------------

export interface CreateRoomRequest {
  name: string;
  password?: string;
  hostName: string;
  options?: {
    maxPlayers?: number;
    showRoles?: boolean;
    timerEnabled?: boolean;
    confirmActions?: boolean;
  };
}

export interface CreateRoomResponse {
  roomId: string;
  code: string;
  shareLink: string;
  token: string;
  playerId: string;
}

export interface JoinRoomRequest {
  name: string;
  password?: string;
}

export interface JoinRoomResponse {
  roomId: string;
  code: string;
  token: string;
  playerId: string;
}
