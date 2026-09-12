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
  PARTY_FACE,
  POLICY_FACE,
  POWER_SEAL,
  RAVI,
  ROLE_FACES,
  VETO_SEAL,
  VOTE_BACK,
  VOTE_FACE,
} from '../assets/cards';
import { EFFECT_URLS } from '../assets/sounds/effects/clips';
import { MUSIC_URLS } from '../assets/sounds/music/clips';
import { RAVI_CLIPS, type RaviWho } from '../assets/sounds/ravi/clips';
import { createSignal } from 'solid-js';
import type { ScreenName } from './NavigationService';
import { nextTrackForScene, type MusicScene } from './music';

const IMAGE_URL = /\.(?:webp|png|jpe?g|gif|svg)(?:\?|$)/i;
const PREFETCH_POOL = 6;
const FETCH_INIT: RequestInit = {
  credentials: 'same-origin',
  cache: 'force-cache',
};

/** Beds that play at the table — warm every one while the lobby waits. */
const TABLE_MUSIC = [
  MUSIC_URLS['night-ambient'],
  MUSIC_URLS['discuss-theme'],
  MUSIC_URLS['discuss-late'],
  MUSIC_URLS['vote-theme'],
  MUSIC_URLS['legislative-theme'],
  MUSIC_URLS['power-theme'],
  MUSIC_URLS['chaos-theme'],
  MUSIC_URLS['over-dawn'],
  MUSIC_URLS['over-dusk'],
] as const;

export interface PrefetchProgress {
  loaded: number;
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

/**
 * Files the next room will need. Once seated, this is the whole table kit
 * (art, beds, SFX, Ravi) so the match does not fetch on first paint.
 */
export function urlsForNextStep(options: NextStepOptions): string[] {
  if (isTableScene(options.scene)) {
    return tableKitUrls(options);
  }

  const urls: string[] = [...visualsForNextScreen(options.scene.screen)];
  if (options.music) {
    const next = nextTrackForScene(options.scene);
    if (next) urls.push(MUSIC_URLS[next]);
  }
  if (options.soundEffects) urls.push(...Object.values(EFFECT_URLS));
  return unique(urls);
}

function tableKitUrls(options: NextStepOptions): string[] {
  const urls: string[] = [
    ...waitingRoomVisualUrls(),
    ...gameTableUrls(),
  ];
  if (options.music) urls.push(...TABLE_MUSIC);
  if (options.soundEffects) urls.push(...Object.values(EFFECT_URLS));
  if (options.raviVoice) {
    urls.push(...Object.values(RAVI_CLIPS[options.raviWho]));
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
    VOTE_BACK,
    NIGHT_VEIL,
    RAVI.idle,
    RAVI.speaking,
    VETO_SEAL,
    ...Object.values(ROLE_FACES).flat(),
    ...Object.values(POLICY_FACE),
    ...Object.values(VOTE_FACE),
    ...Object.values(PARTY_FACE),
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
    default:
      return [];
  }
}

function isPlayFoyer(screen: ScreenName | undefined): boolean {
  return screen === 'play' || screen === 'create-room' || screen === 'join-game';
}

/** Lobby, the table, or a live seat from another screen (rejoin). */
function isTableScene(scene: MusicScene): boolean {
  return (
    scene.screen === 'waiting-room' ||
    scene.screen === 'game' ||
    scene.view != null
  );
}

function unique(urls: readonly string[]): string[] {
  return [...new Set(urls)];
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;
    const succeed = () => {
      if (settled) return;
      settled = true;
      resolve(img);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      reject(new Error(`prefetch image ${url}`));
    };
    img.onload = () => {
      if (typeof img.decode === 'function') {
        void img.decode().then(succeed, succeed);
        return;
      }
      succeed();
    };
    img.onerror = fail;
    img.src = url;
    if (img.complete) {
      queueMicrotask(() => {
        if (!settled) succeed();
      });
    }
  });
}

function headerLength(response: Response): number {
  const parsed = Number(response.headers.get('content-length'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Drain a response into bytes and report downloaded length as they land. */
async function consumeResponse(
  response: Response,
  onProgress?: (received: number, contentLength: number) => void,
): Promise<Uint8Array> {
  const contentLength = headerLength(response);
  if (contentLength > 0) onProgress?.(0, contentLength);

  const body = response.body;
  if (body != null && typeof body.getReader === 'function') {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value == null || value.byteLength === 0) continue;
      const copy = new Uint8Array(value.byteLength);
      copy.set(value);
      chunks.push(copy);
      received += copy.byteLength;
      onProgress?.(received, contentLength > 0 ? contentLength : received);
    }
    if (received > 0) {
      onProgress?.(
        received,
        contentLength > 0 ? Math.max(contentLength, received) : received,
      );
    }
    return concatChunks(chunks, received);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  const received = buffer.byteLength > 0 ? buffer.byteLength : contentLength;
  if (received > 0) onProgress?.(received, received);
  return buffer;
}

function bootProgress(
  urls: readonly string[],
  receivedByUrl: ReadonlyMap<string, number>,
  sizeByUrl: ReadonlyMap<string, number>,
  finishedUrls: ReadonlySet<string>,
): PrefetchProgress {
  const knownSizes: number[] = [];
  for (const url of urls) {
    const size = sizeByUrl.get(url) ?? 0;
    if (size > 0) knownSizes.push(size);
  }
  const average =
    knownSizes.length > 0
      ? knownSizes.reduce((sum, size) => sum + size, 0) / knownSizes.length
      : 1;

  let loaded = 0;
  let total = 0;
  for (const url of urls) {
    const size = sizeByUrl.get(url) ?? 0;
    const received = receivedByUrl.get(url) ?? 0;
    if (size > 0) {
      total += size;
      loaded += finishedUrls.has(url) ? size : Math.min(received, size);
    } else if (knownSizes.length > 0) {
      total += average;
      loaded += finishedUrls.has(url) ? average : received;
    } else {
      total += 1;
      loaded += finishedUrls.has(url) ? 1 : 0;
    }
  }
  return { loaded, total };
}

async function mapPool(
  urls: readonly string[],
  limit: number,
  worker: (url: string) => Promise<void>,
): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const url of urls) {
    const job = worker(url).finally(() => {
      executing.delete(job);
    });
    executing.add(job);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
}

function concatChunks(chunks: readonly Uint8Array[], received: number): Uint8Array {
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function playbackUrlFor(bytes: Uint8Array): string | null {
  if (bytes.byteLength === 0) return null;
  try {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      return URL.createObjectURL(
        new Blob([bytes], { type: 'application/octet-stream' }),
      );
    }
  } catch {
    /* jsdom Blob/object-URL gaps */
  }
  try {
    const chars = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
    return `data:application/octet-stream;base64,${btoa(chars)}`;
  } catch {
    return null;
  }
}

/** Warm a list of URLs so the next beat is already in memory (and in the SW). */
export class PrefetchService {
  private readonly loaded = new Set<string>();
  private readonly inflight = new Map<string, Promise<void>>();
  private readonly objectUrls = new Map<string, string>();
  private readonly images = new Map<string, HTMLImageElement>();
  private booted = false;
  private pending: string[] = [];

  private readonly progressSignal = createSignal<PrefetchProgress>({
    loaded: 0,
    total: 0,
  });
  readonly progress = this.progressSignal[0];
  private readonly setProgress = this.progressSignal[1];

  private readonly warmedSignal = createSignal<ReadonlySet<string>>(new Set());
  private readonly setWarmed = this.warmedSignal[1];

  /**
   * Blob URL when this file has been fully downloaded, else the original.
   * Reads the warmed set so Solid re-renders once the blob lands.
   */
  src(url: string): string {
    this.warmedSignal[0]();
    return this.objectUrls.get(url) ?? url;
  }

  /** Fetch the boot set and report byte progress. Failures still count as done. */
  async boot(urls: readonly string[]): Promise<void> {
    const uniqueUrls = unique(urls);
    const receivedByUrl = new Map<string, number>();
    const sizeByUrl = new Map<string, number>();
    const finishedUrls = new Set<string>();
    const publish = () => {
      this.setProgress(bootProgress(uniqueUrls, receivedByUrl, sizeByUrl, finishedUrls));
    };
    this.setProgress({ loaded: 0, total: uniqueUrls.length });
    if (uniqueUrls.length > 0) {
      await Promise.all(
        uniqueUrls.map(async (url) => {
          await this.load(url, 1, (received, contentLength) => {
            receivedByUrl.set(url, received);
            if (contentLength > 0) sizeByUrl.set(url, Math.max(contentLength, received));
            publish();
          });
          finishedUrls.add(url);
          publish();
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
    void mapPool(unique(urls), PREFETCH_POOL, (url) => this.load(url, 1));
  }

  private load(
    url: string,
    retries: number,
    onProgress?: (received: number, contentLength: number) => void,
  ): Promise<void> {
    if (this.loaded.has(url)) return Promise.resolve();
    const existing = this.inflight.get(url);
    if (existing) return existing;
    const job = this.fetchWithRetry(url, retries, onProgress)
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

  private async fetchWithRetry(
    url: string,
    retries: number,
    onProgress?: (received: number, contentLength: number) => void,
  ): Promise<void> {
    let consumed = false;
    try {
      const response = await fetch(url, FETCH_INIT);
      if (!response.ok) throw new Error(`prefetch ${response.status}`);
      consumed = true;
      const bytes = await consumeResponse(response, onProgress);
      this.keepBytes(url, bytes);
      if (IMAGE_URL.test(url) && typeof Image !== 'undefined') {
        const img = await loadImage(url);
        this.images.set(url, img);
      }
    } catch (error) {
      if (!consumed && retries > 0) {
        return this.fetchWithRetry(url, retries - 1, onProgress);
      }
      throw error;
    }
  }

  private keepBytes(url: string, bytes: Uint8Array): void {
    if (bytes.byteLength === 0 || this.objectUrls.has(url)) return;
    const playback = playbackUrlFor(bytes);
    if (!playback) return;
    this.objectUrls.set(url, playback);
    this.setWarmed((previous) => {
      const next = new Set(previous);
      next.add(url);
      return next;
    });
  }
}
