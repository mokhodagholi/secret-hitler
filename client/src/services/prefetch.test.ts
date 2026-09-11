import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { Phase } from '@secret-hitler/shared';
import heroImage from '../assets/home/hero.webp';
import deskImage from '../assets/home/desk.png';
import { PORTRAITS } from '../assets/avatars';
import { CARD_BACK } from '../assets/cards';
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

describe('criticalBootUrls', () => {
  it('Should include splash art, the home stage, and menu music when audio is on', () => {
    const urls = criticalBootUrls({ music: true, soundEffects: true });
    expect(urls).toContain(heroImage);
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

  it('Should warm night-ambient, opening Ravi, and table art from the waiting room', () => {
    const urls = urlsForNextStep({
      scene: { screen: 'waiting-room', roomClosed: false, view: makeView() },
      raviWho: 'daniel',
      music: true,
      raviVoice: true,
      soundEffects: false,
    });
    expect(urls).toContain(MUSIC_URLS['night-ambient']);
    expect(urls).toContain(RAVI_CLIPS.daniel['deal.start']);
    expect(urls).toContain(CARD_BACK);
    expect(urls).not.toContain(MUSIC_URLS['over-dusk']);
  });

  it('Should skip audio the user has turned off', () => {
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
    expect(urls).toEqual([]);
  });
});

describe('PrefetchService', () => {
  it('Should report progress as each boot URL finishes', async () => {
    rs.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    const prefetch = new PrefetchService();
    await prefetch.boot(['/a.mp3', '/b.mp3']);
    expect(prefetch.progress()).toEqual({ done: 2, total: 2 });
    expect(fetch).toHaveBeenCalledTimes(2);
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
    expect(fetchSpy).toHaveBeenCalledWith('/a.mp3');

    release?.(new Response(null, { status: 200 }));
    await boot;
    expect(fetchSpy).toHaveBeenCalledWith('/next.mp3');
  });

  it('Should retry a failed boot URL once', async () => {
    const fetchSpy = rs
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const prefetch = new PrefetchService();
    await prefetch.boot(['/a.mp3']);
    expect(prefetch.progress()).toEqual({ done: 1, total: 1 });
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
});
