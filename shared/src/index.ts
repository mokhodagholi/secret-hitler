export const SHARED_VERSION = '0.0.1';

// Types
export * from './types/GameState';
export * from './types/events';

// Engine
export { GameEngine } from './engine/GameEngine';
export type { EngineError, EngineEvents } from './engine/GameEngine';
export { Room } from './engine/Room';
export { RoomFactory } from './engine/RoomFactory';
export type { RoomCreateArgs } from './engine/RoomFactory';
export { PlayerFactory } from './engine/PlayerFactory';
export { PolicyDeck } from './engine/PolicyDeck';
export { TypedEmitter } from './engine/EventEmitter';
export { buildRoleBag } from './engine/roleDistribution';
export { makeId, makeRoomCode } from './engine/ids';
