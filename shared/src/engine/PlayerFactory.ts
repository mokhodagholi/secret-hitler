import type { Player } from '../types/GameState';
import { makeId } from './ids';

const AVATAR_COUNT = 8;

/** Builds authoritative {@link Player} records. Construction logic lives here
 *  so domain classes stay free of it (Factory pattern). */
export class PlayerFactory {
  static create(name: string, seat: number, isHost = false): Player {
    return {
      id: makeId(),
      name: name.trim(),
      avatar: seat % AVATAR_COUNT,
      seat,
      isHost,
      connected: true,
      ready: isHost, // host counts as ready by default
      isAlive: true,
      role: null,
    };
  }
}
