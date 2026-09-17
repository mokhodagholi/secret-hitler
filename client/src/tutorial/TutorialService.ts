import { createSignal, type Accessor, type Setter } from 'solid-js';
import type { GameCommand, GameStateView, Role } from '@secret-hitler/shared';
import type { MessageKey } from '../i18n';
import type { NavigationService } from '../services/NavigationService';
import { TutorialDirector } from './TutorialDirector';
import {
  fascistIndex,
  isAllowedChancellor,
  isAllowedPowerTarget,
  liberalIndex,
  nextOnboardCount,
  onboardStepForCount,
  playHandle,
  playView,
  startScriptedTable,
  type OnboardCount,
  type PlayLock,
  type ScriptedTable,
} from './scriptedTable';
import { LOOK_BEATS, buildLookView, type LookYou } from './lookView';
import { INTRO_SLIDE_COUNT, INTRO_SLIDES } from './introSlides';
import type { IntroSlide } from './introSlides';

/** How many times Sit / Skip can be declined before we stop asking. */
export const TUTORIAL_ANNOUNCE_LIMIT = 5;

/** Old rules-hub first-run. Not used to hide the look table. */
export const TUTORIAL_SEEN_COUNT_KEY = 'sh:tutorial-seen-count';

export const ONBOARDING_STEP_KEY = 'sh:onboarding-step';

export const ONBOARDING_DECLINE_KEY = 'sh:onboarding-declines';

export interface TutorialTalk {
  id: string;
  playerId: string;
  name: string;
  key?: MessageKey;
  text?: string;
  at: number;
}

function parseCount(raw: string | null): number {
  if (raw == null) return 0;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

/**
 * Client-only onboarding: intro pages, frozen look, then scripted tables
 * at 5–10. Never opens a socket.
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
  readonly lock: Accessor<PlayLock>;
  readonly playHeadline: Accessor<MessageKey>;
  readonly talk: Accessor<TutorialTalk[]>;
  private readonly setAnnouncing: Setter<boolean>;
  private readonly setOfferingSit: Setter<boolean>;
  private readonly setIntroducing: Setter<boolean>;
  private readonly setLooking: Setter<boolean>;
  private readonly setPlaying: Setter<boolean>;
  private readonly setIntroBeat: Setter<number>;
  private readonly setBeat: Setter<number>;
  private readonly setLookView: Setter<GameStateView | null>;
  private readonly setPlayView: Setter<GameStateView | null>;
  private readonly setLock: Setter<PlayLock>;
  private readonly setPlayHeadline: Setter<MessageKey>;
  private readonly setTalk: Setter<TutorialTalk[]>;

  private lookSettled = false;
  private sitAsked = false;
  private lookYou: LookYou | null = null;
  private table: ScriptedTable | null = null;
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
    const [lock, setLock] = createSignal<PlayLock>(null);
    const [playHeadline, setPlayHeadline] = createSignal<MessageKey>('onboard.pick');
    const [talk, setTalk] = createSignal<TutorialTalk[]>([]);
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
    this.talk = talk;
    this.setTalk = setTalk;
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
    this.stopPlay();
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
    this.stopPlay();
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

  /** After look: open a scripted table. Count 5 is the full small hand. */
  startFive(you: LookYou = this.lookYou ?? { name: 'You', avatar: 0 }): void {
    this.startPlay(you, 5);
  }

  startPlay(
    you: LookYou = this.lookYou ?? { name: 'You', avatar: 0 },
    count: OnboardCount = 5,
  ): void {
    this.lookYou = you;
    this.director?.stop();
    this.director = null;
    // Playing goes true before look ends so GameScreen never sees a gap
    // where onboarding is off and bounces to Play.
    this.setPlaying(true);
    this.endLook();
    const table = startScriptedTable(you, count);
    this.table = table;
    this.setPlayView(playView(table));
    this.setTalk([]);
    this.setLock(null);
    this.director = new TutorialDirector(table, {
      onView: () => this.refreshPlay(),
      onLock: (lock) => this.setLock(lock),
      onHeadline: (key) => this.setPlayHeadline(key as MessageKey),
      onTalk: (playerId, key) => this.appendTalk(playerId, key as MessageKey),
      onDone: () => this.finishPlay(),
    });
    this.director.start();
    this.refreshPlay();
  }

  say(text: string): void {
    if (!this.playing() || !this.table) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    this.pushTalk({
      playerId: this.table.youId,
      name: this.table.room.findPlayer(this.table.youId)?.name ?? '',
      text: trimmed,
    });
  }

  private appendTalk(playerId: string, key: MessageKey): void {
    if (!this.table) return;
    this.pushTalk({
      playerId,
      name: this.table.room.findPlayer(playerId)?.name ?? '',
      key,
    });
  }

  private pushTalk(line: Omit<TutorialTalk, 'id' | 'at'>): void {
    const next: TutorialTalk = {
      ...line,
      id: `talk-${Date.now()}-${this.talk().length}`,
      at: Date.now(),
    };
    this.setTalk((lines) => [...lines, next]);
  }

  skipLook(): void {
    if (!this.looking()) return;
    this.endLook();
    this.bumpDeclines();
  }

  skipFive(): void {
    this.skipPlay();
  }

  skipPlay(): void {
    if (!this.playing()) return;
    const won = this.table?.room.winner != null;
    this.stopPlay();
    if (!won) this.bumpDeclines();
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
    else if (this.playing()) this.skipPlay();
  }

  canNominate(targetId: string): boolean {
    return this.canSelectSeat(targetId);
  }

  canSelectSeat(targetId: string): boolean {
    if (!this.table) return false;
    const lock = this.lock();
    if (lock === 'nominate') return isAllowedChancellor(this.table, targetId);
    if (lock === 'execute' || lock === 'investigate' || lock === 'specialElection') {
      return isAllowedPowerTarget(this.table, lock, targetId);
    }
    return false;
  }

  /** Lift the teaching mask while bots play, and during night (its own overlay). */
  maskLifted(): boolean {
    if (!this.playing()) return false;
    const lock = this.lock();
    return (lock == null || lock === 'night') && this.playView()?.winner == null;
  }

  finishNight(): void {
    if (this.lock() !== 'night' || !this.director) return;
    this.director.afterPlayer('night');
  }

  acknowledgeDelta(): void {
    if (this.lock() !== 'delta' || !this.director) return;
    this.director.afterPlayer('delta');
  }

  /** After a win, sit the next count. False when the ladder is done. */
  continueLadder(): boolean {
    if (!this.playing() || !this.table?.room.winner) return false;
    const next = nextOnboardCount(this.table.count);
    if (next == null) return false;
    this.startPlay(this.lookYou ?? { name: 'You', avatar: 0 }, next);
    return true;
  }

  /** Player command on the scripted table. Rejects off-script taps. */
  handlePlay(command: GameCommand): boolean {
    if (!this.playing() || !this.table || !this.director) return false;
    const lock = this.lock();

    if (command.kind === 'nominateChancellor') {
      if (lock !== 'nominate') return false;
      if (!isAllowedChancellor(this.table, command.targetId)) {
        this.setPlayHeadline(this.table.count === 6 ? 'onboard.termLimit' : 'onboard.pickRetry');
        return false;
      }
      const error = playHandle(this.table, command);
      if (error) return false;
      this.refreshPlay();
      this.director.afterPlayer('nominate');
      return true;
    }

    if (command.kind === 'castVote') {
      if (lock === 'voteJa' && command.vote === 'ja') {
        playHandle(this.table, command);
        this.refreshPlay();
        this.director.afterPlayer('voteJa');
        return true;
      }
      if (lock === 'voteNein' && command.vote === 'nein') {
        playHandle(this.table, command);
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
      playHandle(this.table, command);
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
      playHandle(this.table, command);
      this.refreshPlay();
      this.director.afterPlayer('enactLiberal');
      return true;
    }

    if (command.kind === 'useSpecialPower') {
      if (lock === 'peek') {
        playHandle(this.table, command);
        this.refreshPlay();
        this.director.afterPlayer('peek');
        return true;
      }
      if (lock === 'execute' || lock === 'investigate' || lock === 'specialElection') {
        if (!isAllowedPowerTarget(this.table, lock, command.targetId)) {
          if (lock === 'execute') this.setPlayHeadline('onboard.execute');
          else if (lock === 'investigate') this.setPlayHeadline('onboard.investigate');
          else this.setPlayHeadline('onboard.specialElection');
          return false;
        }
        playHandle(this.table, command);
        this.refreshPlay();
        this.director.afterPlayer(lock);
        return true;
      }
      return false;
    }

    if (command.kind === 'endTurn') {
      playHandle(this.table, command);
      this.refreshPlay();
      return true;
    }

    return false;
  }

  private refreshPlay(): void {
    if (!this.table) return;
    this.setPlayView(playView(this.table));
  }

  private finishPlay(): void {
    if (!this.table) return;
    const step = Math.max(this.completedStep(), onboardStepForCount(this.table.count));
    try {
      localStorage.setItem(ONBOARDING_STEP_KEY, String(step));
    } catch {
      /* private-mode / quota */
    }
    this.director?.stop();
    this.director = null;
    this.setLock(null);
    this.setPlayHeadline(this.table.count === 10 ? 'onboard.win' : 'onboard.winNext');
    this.refreshPlay();
  }

  private stopPlay(): void {
    this.director?.stop();
    this.director = null;
    this.table = null;
    this.setPlaying(false);
    this.setPlayView(null);
    this.setLock(null);
    this.setTalk([]);
  }

  private lockTarget(lock: PlayLock): string {
    if (
      lock === 'nominate' ||
      lock === 'execute' ||
      lock === 'investigate' ||
      lock === 'specialElection' ||
      lock === 'delta' ||
      lock === 'night'
    ) {
      return 'seats';
    }
    if (lock === 'voteJa' || lock === 'voteNein') return 'vote';
    if (lock === 'burnFascist' || lock === 'enactLiberal' || lock === 'peek') {
      return 'laws';
    }
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
