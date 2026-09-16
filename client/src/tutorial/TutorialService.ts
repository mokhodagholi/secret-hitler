import { createSignal, type Accessor, type Setter } from 'solid-js';
import type { GameStateView } from '@secret-hitler/shared';
import type { MessageKey } from '../i18n';
import type { NavigationService } from '../services/NavigationService';
import { LOOK_BEATS, buildLookView, type LookYou } from './lookView';

/** How many times Sit / Skip can be declined before we stop asking. */
export const TUTORIAL_ANNOUNCE_LIMIT = 5;

/** Old rules-hub first-run. Not used to hide the look table. */
export const TUTORIAL_SEEN_COUNT_KEY = 'sh:tutorial-seen-count';

export const ONBOARDING_STEP_KEY = 'sh:onboarding-step';

export const ONBOARDING_DECLINE_KEY = 'sh:onboarding-declines';

function parseCount(raw: string | null): number {
  if (raw == null) return 0;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

/**
 * First-run look: a client-only frozen table. No server room, no Daniel
 * clips — the parchment header carries the lines.
 */
export class TutorialService {
  readonly announcing: Accessor<boolean>;
  readonly offeringSit: Accessor<boolean>;
  readonly looking: Accessor<boolean>;
  readonly beat: Accessor<number>;
  readonly lookView: Accessor<GameStateView | null>;
  private readonly setAnnouncing: Setter<boolean>;
  private readonly setOfferingSit: Setter<boolean>;
  private readonly setLooking: Setter<boolean>;
  private readonly setBeat: Setter<number>;
  private readonly setLookView: Setter<GameStateView | null>;

  private lookSettled = false;
  private sitAsked = false;

  constructor() {
    const [announcing, setAnnouncing] = createSignal(false);
    const [offeringSit, setOfferingSit] = createSignal(false);
    const [looking, setLooking] = createSignal(false);
    const [beat, setBeat] = createSignal(0);
    const [lookView, setLookView] = createSignal<GameStateView | null>(null);
    this.announcing = announcing;
    this.setAnnouncing = setAnnouncing;
    this.offeringSit = offeringSit;
    this.setOfferingSit = setOfferingSit;
    this.looking = looking;
    this.setLooking = setLooking;
    this.beat = beat;
    this.setBeat = setBeat;
    this.lookView = lookView;
    this.setLookView = setLookView;
  }

  seenCount(): number {
    try {
      return parseCount(localStorage.getItem(TUTORIAL_SEEN_COUNT_KEY));
    } catch {
      return 0;
    }
  }

  completedStep(): number {
    try {
      return parseCount(localStorage.getItem(ONBOARDING_STEP_KEY));
    } catch {
      return 0;
    }
  }

  declineCount(): number {
    try {
      return parseCount(localStorage.getItem(ONBOARDING_DECLINE_KEY));
    } catch {
      return 0;
    }
  }

  shouldOffer(): boolean {
    return this.completedStep() < 1 && this.declineCount() < TUTORIAL_ANNOUNCE_LIMIT;
  }

  beginAnnouncement(): void {
    this.setAnnouncing(true);
  }

  /**
   * After splash. No-op when the flag is off, or a restored seat / join
   * screen already owns the first paint — those must not be stolen for the look.
   */
  offerAfterSplash(
    nav: NavigationService,
    occupyingTable: boolean,
    enabled: boolean,
  ): boolean {
    if (
      !enabled ||
      occupyingTable ||
      nav.screen() !== 'home' ||
      !this.shouldOffer()
    ) {
      return false;
    }
    if (this.offeringSit() || this.looking() || this.sitAsked) return false;
    this.sitAsked = true;
    this.setOfferingSit(true);
    return true;
  }

  /** Banner continue or leaving the hub — one increment per announcement. */
  dismissAnnouncement(): void {
    if (!this.announcing()) return;
    this.setAnnouncing(false);
    this.bumpSeen();
  }

  declineSit(): void {
    if (!this.offeringSit()) return;
    this.setOfferingSit(false);
    this.bumpDeclines();
  }

  startLook(you: LookYou): void {
    this.setOfferingSit(false);
    this.lookSettled = false;
    this.setBeat(0);
    this.setLookView(buildLookView(you));
    this.setLooking(true);
  }

  headlineKey(): MessageKey {
    return LOOK_BEATS[this.beat()]?.headline ?? LOOK_BEATS[0].headline;
  }

  target(): string {
    return LOOK_BEATS[this.beat()]?.target ?? LOOK_BEATS[0].target;
  }

  /** True when the look is finished and Home should take over. */
  advanceLook(): boolean {
    if (!this.looking()) return false;
    const next = this.beat() + 1;
    if (next >= LOOK_BEATS.length) {
      this.settleLook();
      return true;
    }
    this.setBeat(next);
    return false;
  }

  skipLook(): void {
    if (!this.looking()) return;
    this.endLook();
    this.bumpDeclines();
  }

  /** Drop look mode once GameScreen has unmounted. */
  closeLook(): void {
    if (!this.looking()) return;
    if (this.lookSettled) this.endLook();
    else this.skipLook();
  }

  private settleLook(): void {
    this.lookSettled = true;
    try {
      localStorage.setItem(ONBOARDING_STEP_KEY, '1');
    } catch {
      /* private-mode / quota */
    }
  }

  private endLook(): void {
    this.lookSettled = false;
    this.setLooking(false);
    this.setLookView(null);
  }

  private bumpSeen(): void {
    const next = Math.min(TUTORIAL_ANNOUNCE_LIMIT, this.seenCount() + 1);
    try {
      localStorage.setItem(TUTORIAL_SEEN_COUNT_KEY, String(next));
    } catch {
      /* private-mode / quota — still drop the banner this visit */
    }
  }

  private bumpDeclines(): void {
    const next = Math.min(TUTORIAL_ANNOUNCE_LIMIT, this.declineCount() + 1);
    try {
      localStorage.setItem(ONBOARDING_DECLINE_KEY, String(next));
    } catch {
      /* private-mode / quota — still drop the offer this visit */
    }
  }
}
