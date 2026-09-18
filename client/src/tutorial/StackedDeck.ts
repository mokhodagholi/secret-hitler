import { PolicyDeck, type Policy } from '@secret-hitler/shared';

/**
 * Fixed tile order for the five-player look table. `reset` is a no-op so
 * GameEngine.startGame cannot reshuffle the script.
 */
export class StackedDeck extends PolicyDeck {
  constructor(private readonly tiles: Policy[]) {
    super();
    this.restore([], []);
  }

  override reset(): void {
    /* Keep the stacked sequence. */
  }

  override drawTiles(count: number): Policy[] {
    return this.tiles.splice(0, count);
  }

  override peekTop(count: number): Policy[] {
    return this.tiles.slice(0, count);
  }

  override discardTiles(tiles: Policy[]): void {
    const snapshot = this.toSnapshot();
    this.restore(snapshot.draw, [...snapshot.discard, ...tiles]);
  }
}
