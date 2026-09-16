import type { ServerErrorCode } from '@secret-hitler/shared';
import type { ConnectionStatus } from '../services/WebSocketService';
import type { MessageKey } from './types';

// Compile-checked maps for server-driven enums. A new error code or status
// fails the build here until its locale entries exist — no `as MessageKey`.

export const ERROR_MESSAGE_KEYS: Record<ServerErrorCode | 'NETWORK', MessageKey> = {
  AUTH_FAILED: 'error.AUTH_FAILED',
  ROOM_NOT_FOUND: 'error.ROOM_NOT_FOUND',
  ROOM_FULL: 'error.ROOM_FULL',
  WRONG_PASSWORD: 'error.WRONG_PASSWORD',
  ALREADY_STARTED: 'error.ALREADY_STARTED',
  NOT_HOST: 'error.NOT_HOST',
  NOT_ENOUGH_PLAYERS: 'error.NOT_ENOUGH_PLAYERS',
  PLAYERS_NOT_READY: 'error.PLAYERS_NOT_READY',
  RATE_LIMITED: 'error.RATE_LIMITED',
  INVALID_ACTION: 'error.INVALID_ACTION',
  BANNED: 'error.BANNED',
  SOCIAL_BLOCKED: 'error.SOCIAL_BLOCKED',
  SOCIAL_COOLDOWN: 'error.SOCIAL_COOLDOWN',
  SOCIAL_LIMIT: 'error.SOCIAL_LIMIT',
  SOCIAL_PENDING: 'error.SOCIAL_PENDING',
  SOCIAL_STRANGER: 'error.SOCIAL_STRANGER',
  SOCIAL_ALREADY: 'error.SOCIAL_ALREADY',
  NETWORK: 'error.NETWORK',
};

export const CONNECTION_STATUS_KEYS: Record<ConnectionStatus, MessageKey> = {
  connected: 'connection.connected',
  connecting: 'connection.connecting',
  disconnected: 'connection.disconnected',
};
