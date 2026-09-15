import { createSignal, type Accessor, type Setter } from 'solid-js';
import type { NavigationService } from './NavigationService';

/** How many launches show the guide as a first-run announcement. */
export const TUTORIAL_ANNOUNCE_LIMIT = 3;

export const TUTORIAL_SEEN_COUNT_KEY = 'sh:tutorial-seen-count';

function parseSeenCount(raw: string | null): number {
  if (raw == null) return 0;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

/**
 * First-run guide: the first three app opens land on the rules hub with a
 * dismissible banner. A live seat or join link still wins over this detour.
 */
export class TutorialPromptService {
  readonly announcing: Accessor<boolean>;
  private readonly setAnnouncing: Setter<boolean>;

  constructor() {
    const [announcing, setAnnouncing] = createSignal(false);
    this.announcing = announcing;
    this.setAnnouncing = setAnnouncing;
  }

  seenCount(): number {
    try {
      return parseSeenCount(localStorage.getItem(TUTORIAL_SEEN_COUNT_KEY));
    } catch {
      return 0;
    }
  }

  shouldOffer(): boolean {
    return this.seenCount() < TUTORIAL_ANNOUNCE_LIMIT;
  }

  beginAnnouncement(): void {
    this.setAnnouncing(true);
  }

  /**
   * After splash. No-op when a restored seat or a join screen already owns
   * the first paint — those must not be stolen for the guide.
   */
  offerAfterSplash(nav: NavigationService, occupyingTable: boolean): boolean {
    if (occupyingTable || nav.screen() !== 'home' || !this.shouldOffer()) {
      return false;
    }
    this.beginAnnouncement();
    nav.navigate('rules');
    return true;
  }

  /** Banner continue or leaving the hub — one increment per announcement. */
  dismissAnnouncement(): void {
    if (!this.announcing()) return;
    this.setAnnouncing(false);
    const next = Math.min(TUTORIAL_ANNOUNCE_LIMIT, this.seenCount() + 1);
    try {
      localStorage.setItem(TUTORIAL_SEEN_COUNT_KEY, String(next));
    } catch {
      /* private-mode / quota — still drop the banner this visit */
    }
  }
}
