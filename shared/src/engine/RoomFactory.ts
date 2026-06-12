import { MAX_PLAYERS, MIN_PLAYERS, type RoomOptions } from '../types/GameState';
import { makeId, makeRoomCode } from './ids';
import { Room } from './Room';

export interface RoomCreateArgs {
  name: string;
  passwordHash?: string | null;
  maxPlayers?: number;
  showRoles?: boolean;
  timerEnabled?: boolean;
  confirmActions?: boolean;
}

/** Creates {@link Room} instances with validated defaults. */
export class RoomFactory {
  static create(args: RoomCreateArgs): Room {
    const maxPlayers = clamp(args.maxPlayers ?? MAX_PLAYERS, MIN_PLAYERS, MAX_PLAYERS);
    const options: RoomOptions = {
      name: args.name.trim() || 'Untitled Room',
      hasPassword: args.passwordHash != null,
      maxPlayers,
      showRoles: args.showRoles ?? false,
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
