import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  SUPPORTED_MIN_PLAYERS,
  type RoomOptions,
} from '../types/GameState';
import { makeId, makeRoomCode } from '../util/ids';
import { Room } from '../domain/Room';

export interface RoomCreateArgs {
  name: string;
  passwordHash?: string | null;
  /** Effective start minimum (server policy); defaults to standard. */
  minPlayers?: number;
  maxPlayers?: number;
  timerEnabled?: boolean;
  confirmActions?: boolean;
}

/** Creates {@link Room} instances with validated defaults. */
export class RoomFactory {
  static create(args: RoomCreateArgs): Room {
    const minPlayers = clamp(
      args.minPlayers ?? MIN_PLAYERS,
      SUPPORTED_MIN_PLAYERS,
      MAX_PLAYERS,
    );
    const maxPlayers = clamp(args.maxPlayers ?? MAX_PLAYERS, minPlayers, MAX_PLAYERS);
    const options: RoomOptions = {
      name: args.name.trim() || 'Untitled Room',
      hasPassword: args.passwordHash != null,
      minPlayers,
      maxPlayers,
      timerEnabled: args.timerEnabled ?? false,
      confirmActions: args.confirmActions ?? true,
    };
    return new Room({
      id: makeId(),
      code: makeRoomCode(),
      options,
      passwordHash: args.passwordHash ?? null,
    });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
