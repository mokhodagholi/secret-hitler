import type { Policy } from '../types/GameState';

const LIBERAL_POLICIES = 6;
const FASCIST_POLICIES = 11;

/**
 * The policy draw/discard deck. Standard Secret Hitler distribution:
 * 6 liberal + 11 fascist tiles. When the draw pile drops below three,
 * the discard pile is shuffled back in.
 */
export class PolicyDeck {
  private draw: Policy[] = [];
  private discard: Policy[] = [];

  constructor(private readonly rng: () => number = Math.random) {
    this.reset();
  }

  reset(): void {
    this.draw = [
      ...Array<Policy>(LIBERAL_POLICIES).fill('liberal'),
      ...Array<Policy>(FASCIST_POLICIES).fill('fascist'),
    ];
    this.discard = [];
    this.shuffle();
  }

  get drawCount(): number {
    return this.draw.length;
  }

  get discardCount(): number {
    return this.discard.length;
  }

  /** Draw `count` tiles, reshuffling the discard pile in if needed. */
  drawTiles(count: number): Policy[] {
    if (this.draw.length < count) this.reshuffleDiscard();
    return this.draw.splice(0, count);
  }

  /** Look at the top `count` tiles without removing them (Policy Peek). */
  peekTop(count: number): Policy[] {
    if (this.draw.length < count) this.reshuffleDiscard();
    return this.draw.slice(0, count);
  }

  discardTiles(tiles: Policy[]): void {
    this.discard.push(...tiles);
  }

  private reshuffleDiscard(): void {
    this.draw.push(...this.discard);
    this.discard = [];
    this.shuffle();
  }

  /** In-place Fisher–Yates shuffle of the draw pile. */
  private shuffle(): void {
    for (let i = this.draw.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [this.draw[i], this.draw[j]] = [this.draw[j], this.draw[i]];
    }
  }
}
