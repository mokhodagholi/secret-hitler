import splashArt from '../assets/splash/hitler-splash.webp';
import {
  CARD_BACK,
  NIGHT_VEIL,
  RAVI,
  ROLE_FACE,
} from '../assets/cards';
import { EFFECT_URLS } from '../assets/sounds/effects/clips';
import { MUSIC_URLS } from '../assets/sounds/music/clips';
import {
  RAVI_CLIPS,
  type RaviWho,
} from '../assets/sounds/ravi/clips';
import { Phase } from '@secret-hitler/shared';
import { createSignal } from 'solid-js';
import { nextTrackForScene, type MusicScene } from './music';

type RaviLineId = keyof (typeof RAVI_CLIPS)['daniel'];

export interface PrefetchProgress {
  done: number;
  total: number;
}

export interface NextStepOptions {
  scene: MusicScene;
  raviWho: RaviWho;
  music: boolean;
  raviVoice: boolean;
}

/** Splash painting + SFX + foyer bed — enough to tap Play. */
export function criticalBootUrls(options: {
  music: boolean;
  soundEffects: boolean;
}): string[] {
  const urls = [splashArt];
  if (options.soundEffects) urls.push(...Object.values(EFFECT_URLS));
  if (options.music) urls.push(MUSIC_URLS['menu-theme']);
  return urls;
}

/** Files the next room will need — never the whole catalog. */
export function urlsForNextStep(options: NextStepOptions): string[] {
  const urls: string[] = [];
  if (options.music) {
    const next = nextTrackForScene(options.scene);
    if (next) urls.push(MUSIC_URLS[next]);
  }
  if (options.raviVoice) {
    for (const id of nextRaviIds(options.scene)) {
      const src = RAVI_CLIPS[options.raviWho][id];
      if (src) urls.push(src);
    }
  }
  if (options.scene.screen === 'waiting-room') {
    urls.push(CARD_BACK, NIGHT_VEIL, RAVI.idle, RAVI.speaking, ...Object.values(ROLE_FACE));
  }
  return urls;
}

/** Warm a list of URLs so the next beat is already on disk (and in the SW). */
export class PrefetchService {
  private readonly loaded = new Set<string>();
  private readonly inflight = new Map<string, Promise<void>>();

  private readonly progressSignal = createSignal<PrefetchProgress>({
    done: 0,
    total: 0,
  });
  readonly progress = this.progressSignal[0];
  private readonly setProgress = this.progressSignal[1];

  /** Fetch the boot set and report progress. Failures still count as done. */
  async boot(urls: readonly string[]): Promise<void> {
    const unique = [...new Set(urls)];
    this.setProgress({ done: 0, total: unique.length });
    if (unique.length === 0) return;
    let done = 0;
    await Promise.all(
      unique.map(async (url) => {
        await this.load(url);
        done += 1;
        this.setProgress({ done, total: unique.length });
      }),
    );
  }

  /** Fire-and-forget warm for the next scene. */
  prefetch(urls: readonly string[]): void {
    void Promise.all(urls.map((url) => this.load(url)));
  }

  private load(url: string): Promise<void> {
    if (this.loaded.has(url)) return Promise.resolve();
    const existing = this.inflight.get(url);
    if (existing) return existing;
    const job = fetch(url)
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        this.loaded.add(url);
        this.inflight.delete(url);
      });
    this.inflight.set(url, job);
    return job;
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
