import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { Phase } from '@secret-hitler/shared';
import heroImage from '../assets/home/hero.webp';
import heroFindingImage from '../assets/home/hero-finding.webp';
import deskImage from '../assets/home/desk.png';
import { PORTRAITS } from '../assets/avatars';
import { CARD_BACK, VOTE_BACK } from '../assets/cards';
import { EFFECT_URLS } from '../assets/sounds/effects/clips';
import { MUSIC_URLS } from '../assets/sounds/music/clips';
import { RAVI_CLIPS } from '../assets/sounds/ravi/clips';
import { makeView } from '../../test/test-utils';
import {
  PrefetchService,
  criticalBootUrls,
  urlsForNextStep,
} from './prefetch';

afterEach(() => {
  rs.restoreAllMocks();
});

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error('timed out waiting');
}

describe('criticalBootUrls', () => {
  it('Should include splash art, the home stage, and menu music when audio is on', () => {
    const urls = criticalBootUrls({ music: true, soundEffects: true });
    expect(urls).toContain(heroImage);
    expect(urls).toContain(heroFindingImage);
    expect(urls).toContain(deskImage);
    expect(urls).toContain(MUSIC_URLS['menu-theme']);
    expect(urls).toContain(EFFECT_URLS['swap-page']);
    expect(urls).not.toContain(MUSIC_URLS['play-theme']);
    expect(urls).not.toContain(EFFECT_URLS['room-start']);
  });

  it('Should skip music and SFX when those toggles are off, but still warm home art', () => {
    const urls = criticalBootUrls({ music: false, soundEffects: false });
    expect(urls).not.toContain(MUSIC_URLS['menu-theme']);
    expect(urls).not.toContain(EFFECT_URLS['swap-page']);
    expect(urls).toContain(heroImage);
    expect(urls).toContain(heroFindingImage);
    expect(urls).toContain(deskImage);
  });

  it('Should include play-theme when the first screen is the play foyer', () => {
    const urls = criticalBootUrls({
      music: true,
      soundEffects: false,
      screen: 'join-game',
    });
    expect(urls).toContain(MUSIC_URLS['menu-theme']);
    expect(urls).toContain(MUSIC_URLS['play-theme']);
  });
});

describe('urlsForNextStep', () => {
  it('Should warm play-theme and player cards from home, not the whole catalog', () => {
    const urls = urlsForNextStep({
      scene: { screen: 'home', roomClosed: false, view: null },
      raviWho: 'daniel',
      music: true,
      raviVoice: true,
      soundEffects: false,
    });
    expect(urls).toContain(MUSIC_URLS['play-theme']);
    expect(urls).toContain(PORTRAITS[0].src);
    expect(urls).not.toContain(MUSIC_URLS['lobby-theme']);
    expect(urls).not.toContain(MUSIC_URLS['over-dusk']);
  });

  it('Should warm the table kit from home when a seat is still live', () => {
    const urls = urlsForNextStep({
      scene: { screen: 'home', roomClosed: false, view: makeView() },
      raviWho: 'daniel',
      music: true,
      raviVoice: true,
      soundEffects: false,
    });
    expect(urls).toContain(CARD_BACK);
    expect(urls).toContain(VOTE_BACK);
    expect(urls).toContain(MUSIC_URLS['night-ambient']);
    expect(urls).toContain(RAVI_CLIPS.daniel['vote.start']);
  });

  it('Should warm lobby art from the play foyer', () => {
    const urls = urlsForNextStep({
      scene: { screen: 'play', roomClosed: false, view: null },
      raviWho: 'daniel',
      music: true,
      raviVoice: false,
      soundEffects: false,
    });
    expect(urls).toContain(MUSIC_URLS['lobby-theme']);
    expect(urls).toContain(PORTRAITS[0].src);
    expect(urls).not.toContain(MUSIC_URLS['night-ambient']);
  });

  it('Should warm the whole table kit from the waiting room', () => {
    const urls = urlsForNextStep({
      scene: { screen: 'waiting-room', roomClosed: false, view: makeView() },
      raviWho: 'daniel',
      music: true,
      raviVoice: true,
      soundEffects: true,
    });
    expect(urls).toContain(MUSIC_URLS['night-ambient']);
    expect(urls).toContain(MUSIC_URLS['over-dusk']);
    expect(urls).toContain(RAVI_CLIPS.daniel['deal.start']);
    expect(urls).toContain(RAVI_CLIPS.daniel['vote.start']);
    expect(urls).toContain(RAVI_CLIPS.daniel['law.vetoAgreed']);
    expect(urls).toContain(CARD_BACK);
    expect(urls).toContain(VOTE_BACK);
    expect(urls).toContain(PORTRAITS[0].src);
    expect(urls).toContain(EFFECT_URLS['deal-slide']);
  });

  it('Should skip audio the user has turned off, but still warm table art', () => {
    const urls = urlsForNextStep({
      scene: {
        screen: 'game',
        roomClosed: false,
        view: makeView({ phase: Phase.Voting }),
      },
      raviWho: 'daniel',
      music: false,
      raviVoice: false,
      soundEffects: false,
    });
    expect(urls).toContain(CARD_BACK);
    expect(urls).toContain(VOTE_BACK);
    expect(urls).not.toContain(MUSIC_URLS['night-ambient']);
    expect(urls).not.toContain(RAVI_CLIPS.daniel['vote.start']);
    expect(urls).not.toContain(EFFECT_URLS['vote-tally']);
  });
});

describe('PrefetchService', () => {
  it('Should report progress as each boot URL finishes', async () => {
    rs.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    const prefetch = new PrefetchService();
    await prefetch.boot(['/a.mp3', '/b.mp3']);
    expect(prefetch.progress()).toEqual({ loaded: 2, total: 2 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('Should report byte progress while a boot file is still downloading', async () => {
    const pendingReads: Array<(result: { done: boolean; value?: Uint8Array }) => void> = [];
    rs.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: { get: (header: string) => (header === 'content-length' ? '8' : null) },
      body: {
        getReader: () => ({
          read: () =>
            new Promise<{ done: boolean; value?: Uint8Array }>((resolve) => {
              pendingReads.push(resolve);
            }),
        }),
      },
    } as unknown as Response);

    const prefetch = new PrefetchService();
    const boot = prefetch.boot(['/theme.mp3']);
    await waitUntil(() => pendingReads.length > 0);
    expect(prefetch.progress()).toEqual({ loaded: 0, total: 8 });

    pendingReads.shift()?.({ done: false, value: new Uint8Array(4) });
    await waitUntil(() => prefetch.progress().loaded === 4);
    expect(prefetch.progress()).toEqual({ loaded: 4, total: 8 });

    await waitUntil(() => pendingReads.length > 0);
    pendingReads.shift()?.({ done: false, value: new Uint8Array(4) });
    await waitUntil(() => pendingReads.length > 0);
    pendingReads.shift()?.({ done: true });
    await boot;
    expect(prefetch.progress()).toEqual({ loaded: 8, total: 8 });
  });

  it('Should not refetch a URL that already landed', async () => {
    const fetchSpy = rs
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    const prefetch = new PrefetchService();
    await prefetch.boot(['/a.mp3']);
    prefetch.prefetch(['/a.mp3']);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('Should hold next-step fetches until boot finishes', async () => {
    let release: ((value: Response) => void) | undefined;
    const fetchSpy = rs.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const prefetch = new PrefetchService();
    prefetch.prefetch(['/next.mp3']);
    expect(fetchSpy).not.toHaveBeenCalled();

    const boot = prefetch.boot(['/a.mp3']);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/a.mp3', {
      credentials: 'same-origin',
      cache: 'force-cache',
    });

    release?.(new Response(null, { status: 200 }));
    await boot;
    expect(fetchSpy).toHaveBeenCalledWith('/next.mp3', {
      credentials: 'same-origin',
      cache: 'force-cache',
    });
  });

  it('Should retry a failed boot URL once', async () => {
    const fetchSpy = rs
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const prefetch = new PrefetchService();
    await prefetch.boot(['/a.mp3']);
    expect(prefetch.progress()).toEqual({ loaded: 1, total: 1 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('Should not mark a URL loaded after both boot attempts fail', async () => {
    const fetchSpy = rs
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('offline'));
    const prefetch = new PrefetchService();
    await prefetch.boot(['/a.mp3']);
    await prefetch.boot(['/a.mp3']);
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it('Should expose a blob URL after the file has been fully downloaded', async () => {
    rs.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      body: {
        getReader: () => {
          let reads = 0;
          return {
            read: async () => {
              reads += 1;
              if (reads === 1) {
                return { done: false, value: new Uint8Array([1, 2, 3, 4]) };
              }
              return { done: true };
            },
          };
        },
      },
    } as unknown as Response);
    const prefetch = new PrefetchService();
    await prefetch.boot(['/line.mp3']);
    expect(prefetch.src('/line.mp3')).not.toBe('/line.mp3');
  });

  it('Should keep the original URL when the download was empty', async () => {
    rs.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    const prefetch = new PrefetchService();
    await prefetch.boot(['/a.mp3']);
    expect(prefetch.src('/a.mp3')).toBe('/a.mp3');
  });
});
