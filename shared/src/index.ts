export const SHARED_VERSION = '0.0.1';

// Types
export * from './types/GameState';
export * from './types/events';
export { AVATAR_COUNT, normalizeAvatar } from './avatars';

// Domain model
export { Room } from './domain/Room';
export type { RoomSnapshot } from './domain/Room';
export { PolicyDeck } from './domain/PolicyDeck';

// Factories
export { PlayerFactory } from './factories/PlayerFactory';
export { RoomFactory } from './factories/RoomFactory';
export type { RoomCreateArgs } from './factories/RoomFactory';

// Rules
export { buildRoleBag } from './rules/roleDistribution';
export { powerForFascistPolicy } from './rules/boardPowers';

// Engine
export { GameEngine } from './engine/GameEngine';
export type { EngineEvents } from './engine/GameEngine';
export type { EngineError } from './engine/errors';
export type { GamePhase, PhaseHost } from './engine/phases/GamePhase';

// Networking
export { MessageRouter } from './net/MessageRouter';
export type { Tagged, MessageHandler } from './net/MessageRouter';
export { parseClientMessage } from './net/clientMessages';

// Utilities
export { TypedEmitter } from './util/TypedEmitter';
export { makeId, makeRoomCode } from './util/ids';
