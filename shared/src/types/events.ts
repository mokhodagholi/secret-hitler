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
import type { FeatureFlags } from '../flags';

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
  | { kind: 'vetoRequest' }
  | { kind: 'vetoConsent'; agree: boolean }
  /** The President ends discussion early, or fails the election once nominating. */
  | { kind: 'endTurn' };

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
  /** Host removes a guest. Lobby: seat gone. In-game: marked dead. */
  | { type: 'player:kick'; playerId: string }
  /** A living player asks the table to remove another living player. */
  | { type: 'kick:request'; playerId: string }
  /** Ja/Nein on an open table kick vote (`agree` = remove them). */
  | { type: 'kick:vote'; agree: boolean }
  /** Explicit leave — host: destroys the room; guest: vacates the seat. */
  | { type: 'room:leave' }
  | { type: 'ping' }
  | { type: 'voice:join' }
  | { type: 'voice:leave' }
  | { type: 'voice:createTransport'; direction: VoiceTransportDirection }
  | {
      type: 'voice:connectTransport';
      transportId: string;
      dtlsParameters: VoiceJson;
    }
  | {
      type: 'voice:produce';
      transportId: string;
      rtpParameters: VoiceJson;
    }
  | {
      type: 'voice:consume';
      producerId: string;
      rtpCapabilities: VoiceJson;
    }
  | { type: 'voice:resumeConsumer'; consumerId: string }
  | { type: 'voice:mute'; muted: boolean }
  | { type: 'voice:speaking'; speaking: boolean };

/** Opaque WebRTC blob (rtp/dtls parameters) — rebuilt only at the envelope. */
export type VoiceJson = Record<string, unknown>;

export type VoiceTransportDirection = 'send' | 'recv';

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// ---------------------------------------------------------------------------
// Server -> Client
// ---------------------------------------------------------------------------

export type ServerErrorCode =
  | 'AUTH_FAILED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'WRONG_PASSWORD'
  | 'ALREADY_STARTED'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'PLAYERS_NOT_READY'
  | 'RATE_LIMITED'
  | 'INVALID_ACTION';

export type RoomClosedReason = 'HOST_LEFT' | 'KICKED';

export type ServerMessage =
  /** Sent once after a successful auth handshake. */
  | { type: 'authed'; playerId: string; flags: FeatureFlags }
  /** Full per-viewer state snapshot — sent on every change. */
  | { type: 'state'; state: GameStateView }
  /** Private role/hand reveal for the recipient only. */
  | { type: 'private'; role: Role }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'log'; entry: LogEntry }
  /** The room was destroyed — everyone is kicked (e.g. the host left). */
  | { type: 'room:closed'; reason: RoomClosedReason }
  | { type: 'error'; code: ServerErrorCode; message: string }
  | { type: 'pong' }
  | {
      type: 'voice:capabilities';
      rtpCapabilities: VoiceJson;
      iceServers: IceServer[];
    }
  | {
      type: 'voice:transportCreated';
      id: string;
      direction: VoiceTransportDirection;
      iceParameters: VoiceJson;
      iceCandidates: VoiceJson[];
      dtlsParameters: VoiceJson;
    }
  | { type: 'voice:transportConnected'; id: string }
  | { type: 'voice:produced'; id: string; transportId: string }
  | {
      type: 'voice:consumed';
      id: string;
      producerId: string;
      playerId: string;
      kind: 'audio';
      rtpParameters: VoiceJson;
      paused: boolean;
    }
  | {
      type: 'voice:peer';
      playerId: string;
      producerId: string | null;
      muted: boolean;
    }
  | { type: 'voice:speaking'; playerId: string; speaking: boolean };

// ---------------------------------------------------------------------------
// HTTP DTOs
// ---------------------------------------------------------------------------

export interface CreateRoomRequest {
  name: string;
  password?: string;
  hostName: string;
  /** Illustrated player-card index; omitted seats use a seat-based default. */
  avatar?: number;
  options?: {
    maxPlayers?: number;
    timerEnabled?: boolean;
    confirmActions?: boolean;
  };
  /** Raw Bale `WebApp.initData` so the bot can /invite this player's room. */
  initData?: string;
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
  /** Illustrated player-card index; omitted seats use a seat-based default. */
  avatar?: number;
  /** Raw Bale `WebApp.initData` so the bot can /invite this player's room. */
  initData?: string;
}

/** Persist the chosen player card for this browser (and Bale user, when signed in). */
export interface SaveProfileRequest {
  avatar: number;
  clientId: string;
  initData?: string;
}

export interface ProfileResponse {
  avatar: number;
}

export interface JoinRoomResponse {
  roomId: string;
  code: string;
  token: string;
  playerId: string;
}
