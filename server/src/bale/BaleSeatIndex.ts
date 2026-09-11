export interface BaleSeat {
  roomId: string;
  code: string;
  playerId: string;
  roomName: string;
}

/** Maps a Bale user id to the live mini-app room they last created or joined. */
export class BaleSeatIndex {
  private readonly byBaleUser = new Map<number, BaleSeat>();
  private readonly byPlayer = new Map<string, number>();

  occupy(baleUserId: number, seat: BaleSeat): void {
    this.releaseBaleUser(baleUserId);
    this.releasePlayer(seat.playerId);
    this.byBaleUser.set(baleUserId, seat);
    this.byPlayer.set(seat.playerId, baleUserId);
  }

  /** Bale user id seated at this player, if they joined through the mini-app. */
  baleUserIdFor(playerId: string): number | undefined {
    return this.byPlayer.get(playerId);
  }

  get(baleUserId: number): BaleSeat | undefined {
    return this.byBaleUser.get(baleUserId);
  }

  releaseBaleUser(baleUserId: number): void {
    const seat = this.byBaleUser.get(baleUserId);
    if (!seat) return;
    this.byBaleUser.delete(baleUserId);
    this.byPlayer.delete(seat.playerId);
  }

  releasePlayer(playerId: string): void {
    const baleUserId = this.byPlayer.get(playerId);
    if (baleUserId == null) return;
    this.byPlayer.delete(playerId);
    this.byBaleUser.delete(baleUserId);
  }

  releaseRoom(roomId: string): void {
    for (const [baleUserId, seat] of [...this.byBaleUser.entries()]) {
      if (seat.roomId !== roomId) continue;
      this.byPlayer.delete(seat.playerId);
      this.byBaleUser.delete(baleUserId);
    }
  }
}
