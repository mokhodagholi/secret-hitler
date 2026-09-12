import type { MessengerKind } from '@secret-hitler/shared';

export interface BaleSeat {
  roomId: string;
  code: string;
  playerId: string;
  roomName: string;
}

function userKey(platform: MessengerKind, userId: number): string {
  return `${platform}:${userId}`;
}

/** Maps a messenger user to the live mini-app room they last created or joined. */
export class BaleSeatIndex {
  private readonly byUser = new Map<string, BaleSeat>();
  private readonly byPlayer = new Map<string, { platform: MessengerKind; userId: number }>();

  occupy(userId: number, seat: BaleSeat, platform: MessengerKind = 'bale'): void {
    this.releaseUser(userId, platform);
    this.releasePlayer(seat.playerId);
    this.byUser.set(userKey(platform, userId), seat);
    this.byPlayer.set(seat.playerId, { platform, userId });
  }

  /** Messenger user id seated at this player, if they joined through a mini-app. */
  baleUserIdFor(playerId: string): number | undefined {
    return this.byPlayer.get(playerId)?.userId;
  }

  identityFor(playerId: string): { platform: MessengerKind; userId: number } | undefined {
    return this.byPlayer.get(playerId);
  }

  get(userId: number, platform: MessengerKind = 'bale'): BaleSeat | undefined {
    return this.byUser.get(userKey(platform, userId));
  }

  releaseBaleUser(userId: number, platform: MessengerKind = 'bale'): void {
    this.releaseUser(userId, platform);
  }

  releasePlayer(playerId: string): void {
    const identity = this.byPlayer.get(playerId);
    if (!identity) return;
    this.byPlayer.delete(playerId);
    this.byUser.delete(userKey(identity.platform, identity.userId));
  }

  releaseRoom(roomId: string): void {
    for (const [key, seat] of [...this.byUser.entries()]) {
      if (seat.roomId !== roomId) continue;
      this.byPlayer.delete(seat.playerId);
      this.byUser.delete(key);
    }
  }

  private releaseUser(userId: number, platform: MessengerKind): void {
    const key = userKey(platform, userId);
    const seat = this.byUser.get(key);
    if (!seat) return;
    this.byUser.delete(key);
    this.byPlayer.delete(seat.playerId);
  }
}
