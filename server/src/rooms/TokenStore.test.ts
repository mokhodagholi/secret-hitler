import { describe, expect, it } from '@rstest/core';
import { TokenStore } from './TokenStore';

describe('TokenStore', () => {
  it('Should look up the claim a token was issued for', () => {
    const store = new TokenStore();
    const token = store.issue({ roomId: 'r1', playerId: 'p1' });
    expect(store.lookup(token)).toEqual({ roomId: 'r1', playerId: 'p1' });
  });

  it('Should forget a revoked token', () => {
    const store = new TokenStore();
    const token = store.issue({ roomId: 'r1', playerId: 'p1' });
    store.revoke(token);
    expect(store.lookup(token)).toBeUndefined();
  });

  it('Should revoke every token of a destroyed room and nothing else', () => {
    const store = new TokenStore();
    const ana = store.issue({ roomId: 'r1', playerId: 'ana' });
    const ben = store.issue({ roomId: 'r1', playerId: 'ben' });
    const other = store.issue({ roomId: 'r2', playerId: 'cal' });

    store.revokeRoom('r1');
    expect(store.lookup(ana)).toBeUndefined();
    expect(store.lookup(ben)).toBeUndefined();
    expect(store.lookup(other)).toBeDefined();
  });

  it('Should revoke every token of a player who left their seat', () => {
    const store = new TokenStore();
    const ana = store.issue({ roomId: 'r1', playerId: 'ana' });
    const ben = store.issue({ roomId: 'r1', playerId: 'ben' });

    store.revokePlayer('ana');
    expect(store.lookup(ana)).toBeUndefined();
    expect(store.lookup(ben)).toBeDefined();
  });
});
