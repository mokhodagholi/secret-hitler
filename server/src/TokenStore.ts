import { makeId } from '@secret-hitler/shared';

export interface TokenClaim {
  roomId: string;
  playerId: string;
}

/**
 * Issues opaque join tokens handed back from the HTTP join/create endpoints
 * and redeemed once over the WebSocket `auth` handshake. Keeps player identity
 * off the query string and lets a disconnected player reclaim their seat.
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
}
