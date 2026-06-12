import { makeId } from '@secret-hitler/shared';

export interface TokenClaim {
  roomId: string;
  playerId: string;
}

/**
 * Issues opaque join tokens handed back from the HTTP join/create endpoints
 * and redeemed once over the WebSocket `auth` handshake. Keeps player identity
 * off the query string and lets a disconnected player reclaim their seat.
 *
 * Tokens must be revoked when their room dies or their seat is vacated —
 * otherwise the map grows for the lifetime of the process.
 */
export class TokenStore {
  private readonly tokens = new Map<string, TokenClaim>();

  issue(claim: TokenClaim): string {
    const token = makeId();
    this.tokens.set(token, claim);
    return token;
  }

  lookup(token: string): TokenClaim | undefined {
    return this.tokens.get(token);
  }

  revoke(token: string): void {
    this.tokens.delete(token);
  }

  /** Drop every token for a destroyed room. */
  revokeRoom(roomId: string): void {
    for (const [token, claim] of this.tokens) {
      if (claim.roomId === roomId) this.tokens.delete(token);
    }
  }

  /** Drop every token for a player who permanently left their seat. */
  revokePlayer(playerId: string): void {
    for (const [token, claim] of this.tokens) {
      if (claim.playerId === playerId) this.tokens.delete(token);
    }
  }
}
