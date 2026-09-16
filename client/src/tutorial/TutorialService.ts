import { createSignal, type Accessor, type Setter } from 'solid-js';
import type { GameCommand, GameStateView, Role } from '@secret-hitler/shared';
import type { MessageKey } from '../i18n';
import type { NavigationService } from '../services/NavigationService';
import { TutorialDirector } from './TutorialDirector';
import {
  fascistIndex,
  fiveHandle,
  fiveView,
  isAllowedChancellor,
  liberalIndex,
  startFiveTable,
  type FiveLock,
  type FiveTable,
} from './fiveTable';
import { LOOK_BEATS, buildLookView, type LookYou } from './lookView';
import { INTRO_SLIDE_COUNT, INTRO_SLIDES } from './introSlides';
import type { IntroSlide } from './introSlides';

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
 * Client-only onboarding: step 0 image pages, step 1 frozen look, then
 * step 2 five-player table. Never opens a socket.
 */
export class TutorialService {
  readonly announcing: Accessor<boolean>;
  readonly offeringSit: Accessor<boolean>;
  readonly introducing: Accessor<boolean>;
  readonly looking: Accessor<boolean>;
  readonly playing: Accessor<boolean>;
  readonly introBeat: Accessor<number>;
  readonly beat: Accessor<number>;
  readonly lookView: Accessor<GameStateView | null>;
  readonly playView: Accessor<GameStateView | null>;
  readonly lock: Accessor<FiveLock>;
  readonly playHeadline: Accessor<MessageKey>;
  private readonly setAnnouncing: Setter<boolean>;
  private readonly setOfferingSit: Setter<boolean>;
  private readonly setIntroducing: Setter<boolean>;
  private readonly setLooking: Setter<boolean>;
  private readonly setPlaying: Setter<boolean>;
  private readonly setIntroBeat: Setter<number>;
  private readonly setBeat: Setter<number>;
  private readonly setLookView: Setter<GameStateView | null>;
  private readonly setPlayView: Setter<GameStateView | null>;
  private readonly setLock: Setter<FiveLock>;
  private readonly setPlayHeadline: Setter<MessageKey>;

  private lookSettled = false;
  private sitAsked = false;
  private lookYou: LookYou | null = null;
  private table: FiveTable | null = null;
  private director: TutorialDirector | null = null;

  constructor() {
    const [announcing, setAnnouncing] = createSignal(false);
    const [offeringSit, setOfferingSit] = createSignal(false);
    const [introducing, setIntroducing] = createSignal(false);
    const [looking, setLooking] = createSignal(false);
    const [playing, setPlaying] = createSignal(false);
    const [introBeat, setIntroBeat] = createSignal(0);
    const [beat, setBeat] = createSignal(0);
    const [lookView, setLookView] = createSignal<GameStateView | null>(null);
    const [playView, setPlayView] = createSignal<GameStateView | null>(null);
    const [lock, setLock] = createSignal<FiveLock>(null);
    const [playHeadline, setPlayHeadline] = createSignal<MessageKey>('onboard.pick');
    this.announcing = announcing;
    this.setAnnouncing = setAnnouncing;
    this.offeringSit = offeringSit;
    this.setOfferingSit = setOfferingSit;
    this.introducing = introducing;
    this.setIntroducing = setIntroducing;
    this.looking = looking;
    this.setLooking = setLooking;
    this.playing = playing;
    this.setPlaying = setPlaying;
    this.introBeat = introBeat;
    this.setIntroBeat = setIntroBeat;
    this.beat = beat;
    this.setBeat = setBeat;
    this.lookView = lookView;
    this.setLookView = setLookView;
    this.playView = playView;
    this.setPlayView = setPlayView;
    this.lock = lock;
    this.setLock = setLock;
    this.playHeadline = playHeadline;
    this.setPlayHeadline = setPlayHeadline;
  }

  /** Any onboarding path owns the client — GameScreen hides the server path. */
  active(): boolean {
    return this.introducing() || this.looking() || this.playing();
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
    if (this.offeringSit() || this.active() || this.sitAsked) return false;
    this.sitAsked = true;
    this.setOfferingSit(true);
    return true;
  }

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

  /** Step 0 — full-page image + text for each idea. */
  startIntro(you: LookYou): void {
    this.stopFive();
    this.endLook();
    this.setOfferingSit(false);
    this.lookYou = you;
    this.setIntroBeat(0);
    this.setIntroducing(true);
  }

  introSlide(): IntroSlide {
    return INTRO_SLIDES[this.introBeat()] ?? INTRO_SLIDES[0];
  }

  /** True when the last intro page is done — caller opens the look table. */
  advanceIntro(): boolean {
    if (!this.introducing()) return false;
    const next = this.introBeat() + 1;
    if (next >= INTRO_SLIDE_COUNT) {
      this.setIntroducing(false);
      return true;
    }
    this.setIntroBeat(next);
    return false;
  }

  /** True when a previous page was restored. */
  retreatIntro(): boolean {
    if (!this.introducing() || this.introBeat() <= 0) return false;
    this.setIntroBeat(this.introBeat() - 1);
    return true;
  }

  /** Back to the first piece page (after "not yet" on the check). */
  restartIntro(): void {
    if (!this.introducing()) return;
    this.setIntroBeat(0);
  }

  skipIntro(): void {
    if (!this.introducing()) return;
    this.setIntroducing(false);
    this.setIntroBeat(0);
    this.bumpDeclines();
  }

  startLook(you: LookYou): void {
    this.stopFive();
    this.setIntroducing(false);
    this.setOfferingSit(false);
    this.lookSettled = false;
    this.lookYou = you;
    this.setBeat(0);
    this.setLookView(buildLookView(you, 0));
    this.setLooking(true);
  }

  headlineKey(): MessageKey {
    if (this.playing()) return this.playHeadline();
    return LOOK_BEATS[this.beat()]?.headline ?? LOOK_BEATS[0].headline;
  }

  target(): string {
    if (this.playing()) return this.lockTarget(this.lock());
    return LOOK_BEATS[this.beat()]?.target ?? LOOK_BEATS[0].target;
  }

  role(): Role | null {
    if (!this.playing() || !this.table) return null;
    return this.table.room.findPlayer(this.table.youId)?.role ?? null;
  }

  /** True when the look is finished — caller should start the five table. */
  advanceLook(): boolean {
    if (!this.looking()) return false;
    const next = this.beat() + 1;
    if (next >= LOOK_BEATS.length) {
      this.settleLook();
      return true;
    }
    this.setBeat(next);
    if (this.lookYou) this.setLookView(buildLookView(this.lookYou, next));
    return false;
  }

  /** Step back one look beat. No-op on the first beat. */
  retreatLook(): void {
    if (!this.looking()) return;
    const previous = this.beat() - 1;
    if (previous < 0) return;
    this.setBeat(previous);
    if (this.lookYou) this.setLookView(buildLookView(this.lookYou, previous));
  }

  /** After look: open the scripted five-player hand on the same Game screen. */
  startFive(you: LookYou = this.lookYou ?? { name: 'You', avatar: 0 }): void {
    this.lookYou = you;
    // Playing goes true before look ends so GameScreen never sees a gap
    // where onboarding is off and bounces to Play.
    this.setPlaying(true);
    this.endLook();
    const table = startFiveTable(you);
    this.table = table;
    this.setPlayView(fiveView(table));
    this.setLock(null);
    this.director = new TutorialDirector(table, {
      onView: () => this.refreshPlay(),
      onLock: (lock) => this.setLock(lock),
      onHeadline: (key) => this.setPlayHeadline(key as MessageKey),
      onDone: () => this.finishFive(),
    });
    this.director.start();
    this.refreshPlay();
  }

  skipLook(): void {
    if (!this.looking()) return;
    this.endLook();
    this.bumpDeclines();
  }

  skipFive(): void {
    if (!this.playing()) return;
    this.stopFive();
    this.bumpDeclines();
  }

  closeLook(): void {
    if (this.looking()) {
      if (this.lookSettled) this.endLook();
      else this.skipLook();
    }
  }

  closeActive(): void {
    if (this.introducing()) this.skipIntro();
    else if (this.looking()) this.closeLook();
    else if (this.playing()) this.skipFive();
  }

  canNominate(targetId: string): boolean {
    return this.lock() === 'nominate' && !!this.table && isAllowedChancellor(this.table, targetId);
  }

  /** Player command on the five table. Rejects off-script taps. */
  handlePlay(command: GameCommand): boolean {
    if (!this.playing() || !this.table || !this.director) return false;
    const lock = this.lock();

    if (command.kind === 'nominateChancellor') {
      if (lock !== 'nominate') return false;
      if (!isAllowedChancellor(this.table, command.targetId)) {
        this.setPlayHeadline('onboard.pickRetry');
        return false;
      }
      const error = fiveHandle(this.table, command);
      if (error) return false;
      this.refreshPlay();
      this.director.afterPlayer('nominate');
      return true;
    }

    if (command.kind === 'castVote') {
      if (lock === 'voteJa' && command.vote === 'ja') {
        fiveHandle(this.table, command);
        this.refreshPlay();
        this.director.afterPlayer('voteJa');
        return true;
      }
      if (lock === 'voteNein' && command.vote === 'nein') {
        fiveHandle(this.table, command);
        this.refreshPlay();
        this.director.afterPlayer('voteNein');
        return true;
      }
      return false;
    }

    if (command.kind === 'discardPolicy') {
      if (lock !== 'burnFascist') return false;
      const hand = this.table.room.drawnPolicies;
      const fascist = fascistIndex(hand);
      if (fascist < 0 || command.index !== fascist) {
        this.setPlayHeadline('onboard.draw');
        return false;
      }
      fiveHandle(this.table, command);
      this.refreshPlay();
      this.director.afterPlayer('burnFascist');
      return true;
    }

    if (command.kind === 'enactPolicy') {
      if (lock !== 'enactLiberal') return false;
      const hand = this.table.room.drawnPolicies;
      const liberal = liberalIndex(hand);
      if (liberal < 0 || command.index !== liberal) {
        this.setPlayHeadline('onboard.chancellor');
        return false;
      }
      fiveHandle(this.table, command);
      this.refreshPlay();
      this.director.afterPlayer('enactLiberal');
      return true;
    }

    if (command.kind === 'useSpecialPower') {
      if (lock === 'peek') {
        fiveHandle(this.table, command);
        this.refreshPlay();
        this.director.afterPlayer('peek');
        return true;
      }
      if (lock === 'execute') {
        if (command.targetId === this.table.omidId) {
          this.setPlayHeadline('onboard.execute');
          return false;
        }
        fiveHandle(this.table, command);
        this.refreshPlay();
        this.director.afterPlayer('execute');
        return true;
      }
      return false;
    }

    if (command.kind === 'endTurn') {
      fiveHandle(this.table, command);
      this.refreshPlay();
      return true;
    }

    return false;
  }

  private refreshPlay(): void {
    if (!this.table) return;
    this.setPlayView(fiveView(this.table));
  }

  private finishFive(): void {
    try {
      localStorage.setItem(ONBOARDING_STEP_KEY, '2');
    } catch {
      /* private-mode / quota */
    }
    this.director?.stop();
    this.director = null;
    this.setLock(null);
    this.setPlayHeadline('onboard.win');
    this.refreshPlay();
  }

  private stopFive(): void {
    this.director?.stop();
    this.director = null;
    this.table = null;
    this.setPlaying(false);
    this.setPlayView(null);
    this.setLock(null);
  }

  private lockTarget(lock: FiveLock): string {
    if (lock === 'nominate' || lock === 'execute') return 'seats';
    if (lock === 'voteJa' || lock === 'voteNein') return 'vote';
    if (lock === 'burnFascist' || lock === 'enactLiberal') return 'laws';
    if (lock === 'peek') return 'laws';
    return 'seats';
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
      /* private-mode / quota */
    }
  }

  private bumpDeclines(): void {
    const next = Math.min(TUTORIAL_ANNOUNCE_LIMIT, this.declineCount() + 1);
    try {
      localStorage.setItem(ONBOARDING_DECLINE_KEY, String(next));
    } catch {
      /* private-mode / quota */
    }
  }
}
