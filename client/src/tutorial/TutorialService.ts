import { createSignal, type Accessor, type Setter } from 'solid-js';
import type {
  GameCommand,
  GameStateView,
  HistoryMatchView,
  Role,
  SocialTieStatus,
} from '@secret-hitler/shared';
import type { MessageKey, MessageValues } from '../i18n';
import type { NavigationService } from '../services/NavigationService';
import { TutorialDirector } from './TutorialDirector';
import {
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
import {
  LOOK_BEATS,
  LOOK_CAMPAIGN,
  LOOK_SEAT,
  buildLookView,
  lookBeatAt,
  lookBlursTable,
  lookShowsChat,
  lookShowsMenu,
  type LookWait,
  type LookYou,
} from './lookView';
import {
  HISTORY_ADD_ACCOUNT,
  HISTORY_BEATS,
  INITIAL_HISTORY_TIES,
  buildHistoryLoss,
  buildHistoryWin,
  historyBeatAt,
  historyExpandMatchIds,
  historyShowsLoss,
  historyShowsSheet,
  type HistoryWait,
} from './historyView';
import {
  settingsBeatAt,
  settingsBeats,
  settingsShowsPage,
  type SettingsBeatSpec,
  type SettingsWait,
} from './settingsView';
import { INTRO_SLIDE_COUNT, INTRO_SLIDES } from './introSlides';
import type { IntroSlide } from './introSlides';

/** How many launches Sit can be declined before we stop asking. */
export const TUTORIAL_ANNOUNCE_LIMIT = 3;

/** Old rules-hub first-run. Not used to hide the look table. */
export const TUTORIAL_SEEN_COUNT_KEY = 'sh:tutorial-seen-count';

export const ONBOARDING_STEP_KEY = 'sh:onboarding-step';

/** Sit / Not now. New name so a filled old tutorial counter does not hide Sit. */
export const ONBOARDING_DECLINE_KEY = 'sh:onboarding-sit-declines';

export const ONBOARDING_HOME_SETTINGS_KEY = 'sh:onboarding-home-settings';

export const ONBOARDING_HOME_HISTORY_KEY = 'sh:onboarding-home-history';

export interface TutorialTalk {
  id: string;
  playerId: string;
  name: string;
  key?: MessageKey;
  values?: MessageValues;
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
  readonly guidingHome: Accessor<boolean>;
  readonly reviewingHistory: Accessor<boolean>;
  readonly historyMatches: Accessor<HistoryMatchView[]>;
  readonly playing: Accessor<boolean>;
  readonly introBeat: Accessor<number>;
  readonly beat: Accessor<number>;
  readonly lookView: Accessor<GameStateView | null>;
  readonly playView: Accessor<GameStateView | null>;
  readonly lock: Accessor<PlayLock>;
  readonly playHeadline: Accessor<MessageKey>;
  readonly talk: Accessor<TutorialTalk[]>;
  readonly playSoon: Accessor<boolean>;
  private readonly setAnnouncing: Setter<boolean>;
  private readonly setOfferingSit: Setter<boolean>;
  private readonly setIntroducing: Setter<boolean>;
  private readonly setLooking: Setter<boolean>;
  private readonly setGuidingHome: Setter<boolean>;
  private readonly setReviewingHistory: Setter<boolean>;
  private readonly setHistoryMatches: Setter<HistoryMatchView[]>;
  private readonly historyTies: Accessor<Record<string, SocialTieStatus>>;
  private readonly setHistoryTies: Setter<Record<string, SocialTieStatus>>;
  private readonly setPlaying: Setter<boolean>;
  private readonly setIntroBeat: Setter<number>;
  private readonly setBeat: Setter<number>;
  private readonly setLookView: Setter<GameStateView | null>;
  private readonly setPlayView: Setter<GameStateView | null>;
  private readonly setLock: Setter<PlayLock>;
  private readonly setPlayHeadline: Setter<MessageKey>;
  private readonly setTalk: Setter<TutorialTalk[]>;
  private readonly setPlaySoon: Setter<boolean>;

  private lookSettled = false;
  private lookPicked = false;
  private lookTimers: number[] = [];
  private sitAsked = false;
  private lookYou: LookYou | null = null;
  private table: ScriptedTable | null = null;
  private director: TutorialDirector | null = null;
  private playLines: MessageKey[] = [];
  private playLineIndex = 0;
  private playLineTimers: number[] = [];
  private playSettled = false;
  private settingsTour: SettingsBeatSpec[] = [];
  private readonly setLookLifted: Setter<boolean>;
  private readonly lookLifted: Accessor<boolean>;
  private readonly lookHintKey: Accessor<MessageKey>;
  private readonly setLookHintKey: Setter<MessageKey>;
  private readonly lookWaitOverride: Accessor<LookWait | null>;
  private readonly setLookWaitOverride: Setter<LookWait | null>;
  private readonly lookHeadlineOverride: Accessor<MessageKey | null>;
  private readonly setLookHeadlineOverride: Setter<MessageKey | null>;
  private readonly lookTest =
    import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test';

  constructor() {
    const [announcing, setAnnouncing] = createSignal(false);
    const [offeringSit, setOfferingSit] = createSignal(false);
    const [introducing, setIntroducing] = createSignal(false);
    const [looking, setLooking] = createSignal(false);
    const [guidingHome, setGuidingHome] = createSignal(false);
    const [reviewingHistory, setReviewingHistory] = createSignal(false);
    const [historyMatches, setHistoryMatches] = createSignal<HistoryMatchView[]>(
      [],
    );
    const [historyTies, setHistoryTies] = createSignal<
      Record<string, SocialTieStatus>
    >({});
    const [playing, setPlaying] = createSignal(false);
    const [introBeat, setIntroBeat] = createSignal(0);
    const [beat, setBeat] = createSignal(0);
    const [lookView, setLookView] = createSignal<GameStateView | null>(null);
    const [playView, setPlayView] = createSignal<GameStateView | null>(null);
    const [lock, setLock] = createSignal<PlayLock>(null);
    const [playHeadline, setPlayHeadline] = createSignal<MessageKey>('onboard.pick');
    const [talk, setTalk] = createSignal<TutorialTalk[]>([]);
    const [playSoon, setPlaySoon] = createSignal(false);
    const [lookLifted, setLookLifted] = createSignal(false);
    const [lookHintKey, setLookHintKey] = createSignal<MessageKey>(
      'onboard.idea.composeHint',
    );
    const [lookWaitOverride, setLookWaitOverride] = createSignal<LookWait | null>(
      null,
    );
    const [lookHeadlineOverride, setLookHeadlineOverride] =
      createSignal<MessageKey | null>(null);
    this.announcing = announcing;
    this.lookLifted = lookLifted;
    this.setLookLifted = setLookLifted;
    this.setAnnouncing = setAnnouncing;
    this.offeringSit = offeringSit;
    this.setOfferingSit = setOfferingSit;
    this.introducing = introducing;
    this.setIntroducing = setIntroducing;
    this.looking = looking;
    this.setLooking = setLooking;
    this.guidingHome = guidingHome;
    this.setGuidingHome = setGuidingHome;
    this.reviewingHistory = reviewingHistory;
    this.setReviewingHistory = setReviewingHistory;
    this.historyMatches = historyMatches;
    this.setHistoryMatches = setHistoryMatches;
    this.historyTies = historyTies;
    this.setHistoryTies = setHistoryTies;
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
    this.playSoon = playSoon;
    this.setPlaySoon = setPlaySoon;
    this.lookHintKey = lookHintKey;
    this.setLookHintKey = setLookHintKey;
    this.lookWaitOverride = lookWaitOverride;
    this.setLookWaitOverride = setLookWaitOverride;
    this.lookHeadlineOverride = lookHeadlineOverride;
    this.setLookHeadlineOverride = setLookHeadlineOverride;
  }

  /** Any onboarding path owns the client — GameScreen hides the server path. */
  active(): boolean {
    return (
      this.introducing() ||
      this.looking() ||
      this.playing() ||
      this.reviewingHistory()
    );
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
    if (this.offeringSit() || this.active() || this.sitAsked || this.guidingHome()) {
      return false;
    }
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

  homeSettingsSeen(): boolean {
    try {
      return localStorage.getItem(ONBOARDING_HOME_SETTINGS_KEY) === '1';
    } catch {
      return false;
    }
  }

  /** First time on Home with no Sit dialog and no table lesson running. */
  canGuideHome(): boolean {
    return (
      !this.homeSettingsSeen() &&
      !this.offeringSit() &&
      (this.sitAsked || !this.shouldOffer()) &&
      !this.active() &&
      !this.guidingHome() &&
      !this.reviewingHistory()
    );
  }

  beginHomeSettings(options?: { voice?: boolean }): boolean {
    if (!this.canGuideHome()) return false;
    this.startHomeSettings(options);
    return true;
  }

  /** Dev replay. Rings the home gear even after it has been seen. */
  startHomeSettings(options?: { voice?: boolean }): void {
    this.stopPlay();
    this.endLook();
    this.endHomeHistory(false);
    this.setOfferingSit(false);
    this.settingsTour = settingsBeats(options?.voice === true);
    this.setGuidingHome(true);
    this.applySettingsBeat(0);
  }

  skipHomeSettings(): void {
    if (!this.guidingHome()) return;
    this.endHomeSettings(true);
  }

  settingsWait(): SettingsWait {
    return this.settingsBeat().wait;
  }

  settingsPage(): boolean {
    return this.guidingHome() && settingsShowsPage(this.settingsBeat());
  }

  canContinueHomeSettings(): boolean {
    return this.guidingHome() && this.settingsWait() === 'continue';
  }

  /** Gear tap. Caller opens Settings. */
  openHomeSettings(): boolean {
    if (!this.guidingHome() || this.settingsWait() !== 'open') return false;
    this.advanceHomeSettings();
    return true;
  }

  /** True when the tour is finished. Caller goes Home. */
  advanceHomeSettings(): boolean {
    if (!this.guidingHome()) return false;
    const next = this.beat() + 1;
    if (next >= this.settingsTour.length) {
      this.endHomeSettings(true);
      return true;
    }
    this.applySettingsBeat(next);
    return false;
  }

  retreatHomeSettings(): void {
    if (!this.guidingHome()) return;
    const previous = this.beat() - 1;
    if (previous < 0) return;
    this.applySettingsBeat(previous);
  }

  homeHistorySeen(): boolean {
    try {
      return localStorage.getItem(ONBOARDING_HOME_HISTORY_KEY) === '1';
    } catch {
      return false;
    }
  }

  canGuideHomeHistory(): boolean {
    return (
      this.homeSettingsSeen() &&
      !this.homeHistorySeen() &&
      !this.offeringSit() &&
      !this.active() &&
      !this.guidingHome()
    );
  }

  beginHomeHistory(you: LookYou): boolean {
    if (!this.canGuideHomeHistory()) return false;
    this.startHomeHistory(you);
    return true;
  }

  startHomeHistory(you: LookYou): void {
    this.stopPlay();
    this.endLook();
    this.endHomeSettings(false);
    this.setOfferingSit(false);
    this.lookYou = you;
    this.setHistoryTies({ ...INITIAL_HISTORY_TIES });
    this.setReviewingHistory(true);
    this.applyHistoryBeat(0);
  }

  skipHomeHistory(): void {
    if (!this.reviewingHistory()) return;
    this.endHomeHistory(true);
  }

  historyWait(): HistoryWait {
    return historyBeatAt(this.beat()).wait;
  }

  historySheet(): boolean {
    return this.reviewingHistory() && historyShowsSheet(this.beat());
  }

  historyExpandIds(): string[] {
    if (!this.reviewingHistory()) return [];
    return historyExpandMatchIds(this.beat());
  }

  historyTie(accountId: string): SocialTieStatus {
    return this.historyTies()[accountId] ?? 'none';
  }

  /** History chip tap — first open, and reopen after they close. */
  openHistoryChip(): boolean {
    if (!this.reviewingHistory() || this.historyWait() !== 'open') return false;
    if (historyBeatAt(this.beat()).target !== 'homeHistory') return false;
    this.advanceHomeHistory();
    return true;
  }

  /** Close (X) on the taught beat. Other beats ignore the X. */
  closeHistorySheet(): boolean {
    if (!this.reviewingHistory() || this.historyWait() !== 'open') return false;
    if (historyBeatAt(this.beat()).target !== 'historyClose') return false;
    this.advanceHomeHistory();
    return true;
  }

  /** Add on the taught seat. Other Adds are ignored. */
  addHistoryFriend(accountId: string): boolean {
    if (!this.reviewingHistory() || this.historyWait() !== 'open') return false;
    if (historyBeatAt(this.beat()).target !== 'historyAdd') return false;
    if (accountId !== HISTORY_ADD_ACCOUNT) return false;
    this.setHistoryTies((ties) => ({ ...ties, [accountId]: 'outgoing' }));
    this.advanceHomeHistory();
    return true;
  }

  canContinueHomeHistory(): boolean {
    return this.reviewingHistory() && this.historyWait() === 'continue';
  }

  /** True when the tour is finished. */
  advanceHomeHistory(): boolean {
    if (!this.reviewingHistory()) return false;
    const next = this.beat() + 1;
    if (next >= HISTORY_BEATS.length) {
      this.endHomeHistory(true);
      return true;
    }
    this.applyHistoryBeat(next);
    return false;
  }

  retreatHomeHistory(): void {
    if (!this.reviewingHistory()) return;
    const previous = this.beat() - 1;
    if (previous < 0) return;
    if (historyBeatAt(previous).target === 'historyAdd') {
      this.setHistoryTies((ties) => ({ ...ties, [HISTORY_ADD_ACCOUNT]: 'none' }));
    }
    this.applyHistoryBeat(previous);
  }

  /** Step 0 — full-page image + text for each idea. */
  startIntro(you: LookYou): void {
    this.stopPlay();
    this.endLook();
    this.endHomeHistory(false);
    this.endHomeSettings(false);
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
    this.endHomeSettings(false);
    this.endHomeHistory(false);
    this.lookSettled = false;
    this.lookYou = you;
    this.setTalk([]);
    this.setLooking(true);
    this.applyLookBeat(0);
  }

  headlineKey(): MessageKey {
    if (this.reviewingHistory()) return historyBeatAt(this.beat()).headline;
    if (this.guidingHome()) return this.settingsBeat().headline;
    // Look wins over play: startPlay sets playing before endLook, and the
    // header must not jump to the scripted line for that gap.
    if (this.looking()) {
      if (this.lookHeadlineOverride()) return this.lookHeadlineOverride()!;
      return lookBeatAt(this.beat()).headline;
    }
    if (this.playing()) return this.playHeadline();
    return lookBeatAt(this.beat()).headline;
  }

  target(): string {
    if (this.reviewingHistory()) return historyBeatAt(this.beat()).target;
    if (this.guidingHome()) return this.settingsBeat().target;
    if (this.playing()) return this.lockTarget(this.lock());
    return lookBeatAt(this.beat()).target;
  }

  lookWait(): LookWait {
    if (this.looking() && this.lookWaitOverride()) return this.lookWaitOverride()!;
    return lookBeatAt(this.beat()).wait;
  }

  lookChat(): boolean {
    return this.looking() && lookShowsChat(this.beat());
  }

  lookMenu(): boolean {
    return this.looking() && lookShowsMenu(this.beat());
  }

  lookBlurred(): boolean {
    return this.looking() && lookBlursTable(this.beat());
  }

  /** Look closer or the five-player “coming soon” card. */
  blurred(): boolean {
    return this.lookBlurred() || this.playSoon();
  }

  lookContinueKey(): MessageKey {
    return lookBeatAt(this.beat()).continueKey ?? 'onboard.continue';
  }

  lookComposeHint(): boolean {
    return this.looking() && this.lookWait() === 'say';
  }

  lookComposeHintKey(): MessageKey {
    return this.lookHintKey();
  }

  /** Composer is the lesson — taps must reach the field. */
  lookTyping(): boolean {
    if (!this.looking()) return false;
    const wait = this.lookWait();
    return wait === 'say' || wait === 'try';
  }

  /** Composer, seats, votes, laws, and the settings gear must receive taps through the hole. */
  passHole(): boolean {
    if (this.guidingHome()) return this.settingsWait() === 'open';
    if (this.reviewingHistory()) return this.historyWait() === 'open';
    if (this.looking()) {
      return (
        this.lookTyping() || this.lookWait() === 'pick' || this.lookWait() === 'open'
      );
    }
    if (!this.playing()) return false;
    const lock = this.lock();
    return (
      lock === 'openNominate' ||
      lock === 'nominate' ||
      lock === 'voteJa' ||
      lock === 'voteNein' ||
      lock === 'burnFascist' ||
      lock === 'enactLiberal' ||
      lock === 'peek' ||
      lock === 'execute' ||
      lock === 'investigate' ||
      lock === 'specialElection'
    );
  }

  lookPassHole(): boolean {
    return this.passHole();
  }

  canContinueLook(): boolean {
    return this.looking() && this.lookWait() === 'continue';
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
    this.applyLookBeat(next);
    return false;
  }

  /** Step back one look beat. No-op on the first beat. */
  retreatLook(): void {
    if (!this.looking()) return;
    const previous = this.beat() - 1;
    if (previous < 0) return;
    this.applyLookBeat(previous);
  }

  /**
   * Daniel finished typing this look line. Pause beats wait, then move on.
   */
  lookHeadlineFinished(): void {
    if (!this.looking()) return;
    const beat = lookBeatAt(this.beat());
    if (beat.wait !== 'pause') return;
    this.stopLookScript();
    const waitMs =
      this.lookTest
        ? 0
        : 'pauseMs' in beat && beat.pauseMs != null
          ? beat.pauseMs
          : this.lookDelay(1400, 2200);
    this.scheduleLook(() => {
      if (lookBeatAt(this.beat()).wait !== 'pause') return;
      this.advanceLook();
    }, waitMs);
  }

  /**
   * Skip the look table. True so the caller can open the five-player hand.
   */
  skipLookBeat(): boolean {
    if (!this.looking()) return false;
    this.settleLook();
    return true;
  }

  /** Gear tap on the settings beat. Ignored on every other look wait. */
  openLookSettings(): void {
    if (!this.looking() || this.lookWait() !== 'open') return;
    this.advanceLook();
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
    this.setPlaySoon(false);
    this.playSettled = false;
    this.playLines = [];
    this.playLineIndex = 0;
    this.stopPlayLines();
    this.director = new TutorialDirector(table, {
      onView: () => this.refreshPlay(),
      onLock: (lock) => this.setLock(lock),
      onHeadline: (key) => this.setPlayLines(key),
      onTalk: (playerId, key) => this.appendTalk(playerId, key),
      onDone: () => this.finishPlay(),
      onSoon: () => this.showComingSoon(),
    });
    this.director.start();
    this.refreshPlay();
  }

  /** Any non-empty line. The look pitch does not have to match the ghost. */
  say(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (this.looking()) {
      if (!this.lookYou) return;
      if (this.lookWait() === 'try') {
        this.pushTalk({
          playerId: LOOK_SEAT.you,
          name: this.lookYou.name,
          text: trimmed,
        });
        this.advanceLook();
        return;
      }
      if (this.lookWait() !== 'say') return;
      this.pushTalk({
        playerId: LOOK_SEAT.you,
        name: this.lookYou.name,
        text: trimmed,
      });
      this.acceptPitch();
      return;
    }
    if (!this.playing() || !this.table) return;
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
    const won = this.table?.room.winner != null || this.playSettled;
    this.stopPlay();
    if (!won) this.bumpDeclines();
  }

  /** Five-player skip lands on the coming-soon card, not six. */
  skipFiveSoon(): boolean {
    if (!this.playing() || this.table?.count !== 5) return false;
    if (this.playSoon()) return false;
    this.director?.stop();
    this.director = null;
    this.showComingSoon();
    return true;
  }

  /** Skip this count and sit the next. False when the ladder is done. */
  skipToNextPlay(): boolean {
    if (!this.playing() || !this.table) return false;
    const next = nextOnboardCount(this.table.count);
    if (next == null) return false;
    this.startPlay(this.lookYou ?? { name: 'You', avatar: 0 }, next);
    return true;
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
    else if (this.reviewingHistory()) this.skipHomeHistory();
    else if (this.guidingHome()) this.skipHomeSettings();
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

  /** First five-player pick: the gold ring sits on Nima. */
  isNominateHintSeat(playerId: string): boolean {
    return (
      this.playing() &&
      this.lock() === 'nominate' &&
      this.table?.strictFirstPick === true &&
      this.table.nimaId === playerId
    );
  }

  /** Lift the teaching mask while bots play, during night, and while the Chancellor picks in secret. */
  maskLifted(): boolean {
    if (this.guidingHome()) return this.settingsBeat().lifted === true;
    if (this.reviewingHistory()) {
      return historyBeatAt(this.beat()).lifted === true;
    }
    if (this.looking()) {
      return lookBeatAt(this.beat()).lifted === true || this.lookLifted();
    }
    if (!this.playing()) return false;
    if (this.playSoon()) return true;
    const lock = this.lock();
    return (
      (lock == null || lock === 'night' || lock === 'watchEnact') &&
      this.playView()?.winner == null
    );
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
        this.setPlayHeadline(this.retryHeadline(command.targetId));
        return false;
      }
      const error = playHandle(this.table, command);
      if (error) return false;
      this.refreshPlay();
      this.director.afterPlayer('nominate');
      return true;
    }

    if (command.kind === 'castVote') {
      if (lock === 'voteJa') {
        if (command.vote === 'ja') {
          playHandle(this.table, command);
          this.refreshPlay();
          this.director.afterPlayer('voteJa');
          return true;
        }
        this.setPlayHeadline('onboard.voteRetry');
        return false;
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
      if (command.index < 0 || command.index >= hand.length) {
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
      if (lock !== 'openNominate') return false;
      const error = playHandle(this.table, command);
      if (error) return false;
      this.refreshPlay();
      this.director.afterPlayer('openNominate');
      return true;
    }

    return false;
  }

  /**
   * Daniel finished typing this play line. Queued lines wait, then move on.
   */
  playHeadlineFinished(): void {
    if (!this.playing() || this.playSoon()) return;
    if (this.playLineIndex >= this.playLines.length - 1) return;
    this.stopPlayLines();
    const waitMs = this.lookTest ? 0 : 3000;
    const timer = window.setTimeout(() => {
      if (!this.playing() || this.playSoon()) return;
      if (this.playLineIndex >= this.playLines.length - 1) return;
      this.playLineIndex += 1;
      const next = this.playLines[this.playLineIndex];
      if (next) this.setPlayHeadline(next);
    }, waitMs);
    this.playLineTimers.push(timer);
  }

  /** Teaching header while a lock is on — night keeps the live Ravi line. */
  guidesHeader(): boolean {
    if (!this.playing()) return false;
    if (this.playSoon()) return true;
    if (this.playLines.length > 0) return true;
    const lock = this.lock();
    return lock != null && lock !== 'night';
  }

  private setPlayLines(key: MessageKey | readonly MessageKey[]): void {
    this.stopPlayLines();
    const lines = typeof key === 'string' ? [key] : [...key];
    this.playLines = lines;
    this.playLineIndex = 0;
    const first = lines[0];
    if (first) this.setPlayHeadline(first);
  }

  private stopPlayLines(): void {
    for (const timer of this.playLineTimers) window.clearTimeout(timer);
    this.playLineTimers = [];
  }

  private showComingSoon(): void {
    this.playSettled = true;
    this.stopPlayLines();
    this.playLines = ['onboard.comingSoon'];
    this.playLineIndex = 0;
    this.setLock(null);
    this.setPlayHeadline('onboard.comingSoon');
    this.setPlaySoon(true);
    try {
      localStorage.setItem(ONBOARDING_STEP_KEY, String(Math.max(this.completedStep(), 2)));
    } catch {
      /* private-mode / quota */
    }
    this.refreshPlay();
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
    this.stopPlayLines();
    this.playLines = [];
    this.playLineIndex = 0;
    this.playSettled = false;
    this.setPlaying(false);
    this.setPlayView(null);
    this.setLock(null);
    this.setPlaySoon(false);
    this.setTalk([]);
  }

  private retryHeadline(targetId: string): MessageKey {
    if (!this.table) return 'onboard.pickRetry';
    if (this.table.room.ineligibleChancellorIds().includes(targetId)) {
      return this.table.count === 6 ? 'onboard.termLimit' : 'onboard.termLimitFive';
    }
    return this.table.count === 6 ? 'onboard.termLimit' : 'onboard.pickRetry';
  }

  private lockTarget(lock: PlayLock): string {
    if (lock === 'openNominate') return 'nominateAction';
    if (lock === 'nominate' && this.table?.strictFirstPick) return 'nima';
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
    if (
      lock === 'burnFascist' ||
      lock === 'enactLiberal' ||
      lock === 'peek' ||
      lock === 'watchEnact'
    ) {
      return 'laws';
    }
    return 'seats';
  }

  private applyLookBeat(index: number): void {
    this.stopLookScript();
    this.setLookWaitOverride(null);
    this.setLookHeadlineOverride(null);
    this.setBeat(index);
    this.setLookLifted(false);
    const beat = lookBeatAt(index);
    const tryFrom = LOOK_BEATS.findIndex((item) => item.wait === 'try');
    const governmentFrom = LOOK_BEATS.findIndex((item) => item.target === 'government');
    if (index < governmentFrom) this.lookPicked = false;
    if (beat.wait !== 'say') {
      this.setLookHintKey('onboard.idea.composeHint');
    }
    // Keep the viewer's first line on the table until they write again.
    if (index < tryFrom) this.setTalk([]);
    this.refreshLookView();
    if (beat.wait === 'talk') this.startCampaignTalk();
  }

  private refreshLookView(): void {
    if (!this.lookYou) return;
    this.setLookView(
      buildLookView(this.lookYou, this.beat(), { picked: this.lookPicked }),
    );
  }

  private startCampaignTalk(): void {
    const speak = (offset: number): void => {
      if (offset >= LOOK_CAMPAIGN.length) {
        this.advanceLook();
        return;
      }
      const line = LOOK_CAMPAIGN[offset];
      if (!line) {
        this.advanceLook();
        return;
      }
      this.pushTalk({
        playerId: LOOK_SEAT[line.seat],
        name: this.companionName(line.seat),
        key: line.key,
      });
      this.scheduleLook(() => speak(offset + 1), this.lookDelay(4500, 6500));
    };
    this.scheduleLook(() => speak(0), this.lookDelay(3500, 5000));
  }

  private acceptPitch(): void {
    this.setLookLifted(true);
    this.setLookWaitOverride('auto');
    this.scheduleLook(() => {
      this.pushTalk({
        playerId: LOOK_SEAT.nima,
        name: this.companionName('nima'),
        key: 'onboard.talk.iPickYou',
        values: { name: this.lookYou?.name ?? '' },
      });
    }, this.lookDelay(1400, 2200));
    this.scheduleLook(() => {
      this.lookPicked = true;
      this.setLookWaitOverride(null);
      this.refreshLookView();
      this.advanceLook();
    }, this.lookDelay(2600, 3600));
  }

  private companionName(seat: keyof typeof LOOK_SEAT): string {
    if (seat === 'you') return this.lookYou?.name ?? '';
    const order = ['nima', 'sara', 'reza', 'omid'] as const;
    const index = order.indexOf(seat);
    return this.lookYou?.companions?.[index] ?? ['Nima', 'Sara', 'Reza', 'Omid'][index] ?? '';
  }

  private lookDelay(min: number, max: number): number {
    if (this.lookTest) return 0;
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  private scheduleLook(fn: () => void, ms: number): void {
    const id = window.setTimeout(fn, ms);
    this.lookTimers.push(id);
  }

  private stopLookScript(): void {
    for (const timer of this.lookTimers) window.clearTimeout(timer);
    this.lookTimers = [];
  }

  private settleLook(): void {
    this.lookSettled = true;
    this.stopLookScript();
    try {
      localStorage.setItem(ONBOARDING_STEP_KEY, '1');
    } catch {
      /* private-mode / quota */
    }
  }

  private endLook(): void {
    this.lookSettled = false;
    this.lookPicked = false;
    this.setLookHintKey('onboard.idea.composeHint');
    this.setLookWaitOverride(null);
    this.setLookHeadlineOverride(null);
    this.setLookLifted(false);
    this.stopLookScript();
    this.setTalk([]);
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

  private applyHistoryBeat(index: number): void {
    this.setBeat(index);
    const you = this.lookYou;
    if (!you) {
      this.setHistoryMatches([]);
      return;
    }
    const win = buildHistoryWin(you);
    this.setHistoryMatches(
      historyShowsLoss(index) ? [win, buildHistoryLoss(you)] : [win],
    );
  }

  private endHomeHistory(remember: boolean): void {
    if (remember) this.markHomeHistorySeen();
    this.setReviewingHistory(false);
    this.setHistoryMatches([]);
    this.setHistoryTies({});
  }

  private settingsBeat(): SettingsBeatSpec {
    return settingsBeatAt(this.beat(), this.settingsTour);
  }

  private applySettingsBeat(index: number): void {
    this.setBeat(index);
  }

  private endHomeSettings(remember: boolean): void {
    if (remember) this.markHomeSettingsSeen();
    this.settingsTour = [];
    this.setGuidingHome(false);
  }

  private markHomeSettingsSeen(): void {
    try {
      localStorage.setItem(ONBOARDING_HOME_SETTINGS_KEY, '1');
    } catch {
      /* private-mode / quota */
    }
  }

  private markHomeHistorySeen(): void {
    try {
      localStorage.setItem(ONBOARDING_HOME_HISTORY_KEY, '1');
    } catch {
      /* private-mode / quota */
    }
  }
}
