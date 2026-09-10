import type { Player } from '../types/GameState';
import { AVATAR_COUNT, normalizeAvatar } from '../avatars';
import { makeId } from '../util/ids';

/** Builds authoritative {@link Player} records. Construction logic lives here
 *  so domain classes stay free of it (Factory pattern). */
export class PlayerFactory {
  static create(name: string, seat: number, isHost = false, avatar?: number): Player {
    return {
      id: makeId(),
      name: name.trim(),
      avatar: avatar != null ? normalizeAvatar(avatar) : seat % AVATAR_COUNT,
      seat,
      isHost,
      connected: true,
      ready: isHost, // hosts are implicitly ready; guests opt in from the lobby
      isAlive: true,
      role: null,
    };
  }
}
