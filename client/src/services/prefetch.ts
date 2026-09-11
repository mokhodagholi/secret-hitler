import splashArt from '../assets/splash/hitler-splash.webp';
import heroImage from '../assets/home/hero.webp';
import deskImage from '../assets/home/desk.png';
import liberalBoard from '../assets/boards/liberal.png';
import fascistBoard from '../assets/boards/fascist.png';
import awaitingBg from '../assets/lobby/awaiting-bg.png';
import patternPaper from '../assets/ui/pattern.webp';
import { PAPER_FRAME, PORTRAITS, avatarImage } from '../assets/avatars';
import {
  CARD_BACK,
  NIGHT_VEIL,
  OFFICE_PLACARD,
  PARTY_FACE,
  POLICY_FACE,
  POWER_SEAL,
  RAVI,
  ROLE_FACE,
  VETO_SEAL,
  VOTE_FACE,
} from '../assets/cards';
import { EFFECT_URLS } from '../assets/sounds/effects/clips';
import { MUSIC_URLS } from '../assets/sounds/music/clips';
import {
  RAVI_CLIPS,
  type RaviWho,
} from '../assets/sounds/ravi/clips';
import { Phase } from '@secret-hitler/shared';
import { createSignal } from 'solid-js';
import type { ScreenName } from './NavigationService';
import { nextTrackForScene, type MusicScene } from './music';

type RaviLineId = keyof (typeof RAVI_CLIPS)['daniel'];

const IMAGE_URL = /\.(?:webp|png|jpe?g|gif|svg)(?:\?|$)/i;

export interface PrefetchProgress {
  done: number;
  total: number;
}

export interface BootPrefetchOptions {
  music: boolean;
  soundEffects: boolean;
  screen?: ScreenName;
  avatar?: number;
}

export interface NextStepOptions {
  scene: MusicScene;
  raviWho: RaviWho;
  music: boolean;
  raviVoice: boolean;
  soundEffects: boolean;
}

/** Splash painting + the home stage — splash must not lift until these land. */
export function criticalBootUrls(options: BootPrefetchOptions): string[] {
  const urls = [splashArt, ...homeVisualUrls(options.avatar ?? 0)];
  if (options.soundEffects) urls.push(EFFECT_URLS['swap-page']);
  if (options.music) {
    urls.push(MUSIC_URLS['menu-theme']);
    if (isPlayFoyer(options.screen)) urls.push(MUSIC_URLS['play-theme']);
  }
  return unique(urls);
}

/** Files the next room will need — never the whole catalog. */
export function urlsForNextStep(options: NextStepOptions): string[] {
  const urls: string[] = [...visualsForNextScreen(options.scene.screen)];
  if (options.music) {
    const next = nextTrackForScene(options.scene);
    if (next) urls.push(MUSIC_URLS[next]);
  }
  if (options.soundEffects && options.scene.screen !== 'game') {
    urls.push(...Object.values(EFFECT_URLS));
  }
  if (options.raviVoice) {
    for (const id of nextRaviIds(options.scene)) {
      const src = RAVI_CLIPS[options.raviWho][id];
      if (src) urls.push(src);
    }
  }
  return unique(urls);
}

function homeVisualUrls(avatar: number): string[] {
  return [heroImage, deskImage, liberalBoard, fascistBoard, avatarImage(avatar)];
}

function playerCardUrls(): string[] {
  return [patternPaper, ...PORTRAITS.map((portrait) => portrait.src)];
}

function waitingRoomVisualUrls(): string[] {
  return [awaitingBg, PAPER_FRAME, ...PORTRAITS.map((portrait) => portrait.src)];
}

function gameTableUrls(): string[] {
  return [
    liberalBoard,
    fascistBoard,
    CARD_BACK,
    NIGHT_VEIL,
    RAVI.idle,
    RAVI.speaking,
    VETO_SEAL,
    ...Object.values(ROLE_FACE),
    ...Object.values(POLICY_FACE),
    ...Object.values(VOTE_FACE),
    ...Object.values(PARTY_FACE),
    ...Object.values(OFFICE_PLACARD),
    ...Object.values(POWER_SEAL),
  ];
}

function visualsForNextScreen(screen: ScreenName): string[] {
  switch (screen) {
    case 'home':
      return playerCardUrls();
    case 'play':
    case 'create-room':
    case 'join-game':
      return waitingRoomVisualUrls();
    case 'waiting-room':
      return gameTableUrls();
    default:
      return [];
  }
}

function isPlayFoyer(screen: ScreenName | undefined): boolean {
  return screen === 'play' || screen === 'create-room' || screen === 'join-game';
}

function unique(urls: readonly string[]): string[] {
  return [...new Set(urls)];
}

function loadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (typeof img.decode === 'function') {
        void img.decode().then(() => resolve(), () => resolve());
        return;
      }
      resolve();
    };
    img.onerror = () => reject(new Error(`prefetch image ${url}`));
    img.src = url;
  });
}

/** Warm a list of URLs so the next beat is already on disk (and in the SW). */
export class PrefetchService {
  private readonly loaded = new Set<string>();
  private readonly inflight = new Map<string, Promise<void>>();
  private booted = false;
  private pending: string[] = [];

  private readonly progressSignal = createSignal<PrefetchProgress>({
    done: 0,
    total: 0,
  });
  readonly progress = this.progressSignal[0];
  private readonly setProgress = this.progressSignal[1];

  /** Fetch the boot set and report progress. Failures still count as done. */
  async boot(urls: readonly string[]): Promise<void> {
    const uniqueUrls = unique(urls);
    this.setProgress({ done: 0, total: uniqueUrls.length });
    if (uniqueUrls.length > 0) {
      let done = 0;
      await Promise.all(
        uniqueUrls.map(async (url) => {
          await this.load(url, 1);
          done += 1;
          this.setProgress({ done, total: uniqueUrls.length });
        }),
      );
    }
    this.booted = true;
    const queued = this.pending;
    this.pending = [];
    if (queued.length > 0) this.prefetch(queued);
  }

  /** Fire-and-forget warm for the next scene. Held until boot finishes. */
  prefetch(urls: readonly string[]): void {
    if (!this.booted) {
      this.pending.push(...urls);
      return;
    }
    void Promise.all(urls.map((url) => this.load(url, 0)));
  }

  private load(url: string, retries: number): Promise<void> {
    if (this.loaded.has(url)) return Promise.resolve();
    const existing = this.inflight.get(url);
    if (existing) return existing;
    const job = this.fetchWithRetry(url, retries)
      .then(() => {
        this.loaded.add(url);
      })
      .catch(() => undefined)
      .finally(() => {
        this.inflight.delete(url);
      });
    this.inflight.set(url, job);
    return job;
  }

  private async fetchWithRetry(url: string, retries: number): Promise<void> {
    try {
      if (IMAGE_URL.test(url) && typeof Image !== 'undefined') {
        await loadImage(url);
        return;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error(`prefetch ${response.status}`);
      await response.blob();
    } catch (error) {
      if (retries > 0) return this.fetchWithRetry(url, retries - 1);
      throw error;
    }
  }
}

function nextRaviIds(scene: MusicScene): RaviLineId[] {
  if (scene.roomClosed) return [];
  if (scene.screen === 'waiting-room') {
    return [
      'deal.start',
      'deal.look',
      'night.start',
      'night.end',
      'president.first',
      'president.firstYou',
      'private.youLiberal',
      'private.youFascist',
      'private.youHitler',
    ];
  }
  if (scene.screen !== 'game' || !scene.view) return [];
  switch (scene.view.phase) {
    case Phase.Nomination:
      return [
        'nominate.start',
        'nominate.named',
        'nominate.namedYou',
        'discuss.start',
        'vote.start',
      ];
    case Phase.Voting:
      return [
        'vote.collecting',
        'vote.count',
        'vote.passed',
        'vote.failed',
        'vote.hitlerChancellor',
      ];
    case Phase.PresidentLegislative:
      return ['law.draw', 'law.presidentChoosing', 'law.burned', 'law.pass'];
    case Phase.ChancellorLegislative:
      return [
        'law.chancellorChoosing',
        'law.liberal',
        'law.fascist',
        'law.vetoOffered',
      ];
    case Phase.SpecialPower:
      return ['power.investigate', 'power.peek', 'power.execution', 'power.specialElection'];
    case Phase.GameOver:
      return ['game.reveal', 'game.liberalsWin.policies', 'game.fascistsWin.policies'];
    default:
      return [];
  }
}
