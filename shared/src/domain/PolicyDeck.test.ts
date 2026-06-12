import { describe, expect, it } from '@rstest/core';
import { PolicyDeck } from './PolicyDeck';

describe('PolicyDeck', () => {
  it('Should hold the standard 6 liberal + 11 fascist tiles after a reset', () => {
    const deck = new PolicyDeck();
    const tiles = deck.drawTiles(17);
    expect(tiles).toHaveLength(17);
    expect(tiles.filter((tile) => tile === 'liberal')).toHaveLength(6);
    expect(tiles.filter((tile) => tile === 'fascist')).toHaveLength(11);
    expect(deck.drawCount).toBe(0);
  });

  it('Should shrink the draw pile by the number of tiles drawn', () => {
    const deck = new PolicyDeck();
    deck.drawTiles(3);
    expect(deck.drawCount).toBe(14);
  });

  it('Should reshuffle the discard pile in when the draw pile runs short', () => {
    const deck = new PolicyDeck();
    const drawn = deck.drawTiles(16);
    deck.discardTiles(drawn);
    expect(deck.drawCount).toBe(1);
    expect(deck.discardCount).toBe(16);

    const refill = deck.drawTiles(3);
    expect(refill).toHaveLength(3);
    expect(deck.discardCount).toBe(0);
    expect(deck.drawCount).toBe(14);
  });

  it('Should produce the same order for the same seeded rng', () => {
    const sequence = [0.42, 0.1, 0.99, 0.5, 0.31, 0.77];
    const makeRng = () => {
      let i = 0;
      return () => sequence[i++ % sequence.length];
    };
    const first = new PolicyDeck(makeRng()).drawTiles(17);
    const second = new PolicyDeck(makeRng()).drawTiles(17);
    expect(first).toEqual(second);
  });
});
