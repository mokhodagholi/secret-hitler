import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { Phase } from '@secret-hitler/shared';
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
  it('Should include the painting, the foyer bed, and SFX when audio is on', () => {
    const urls = criticalBootUrls({ music: true, soundEffects: true });
    expect(urls[0]).toBeTruthy();
    expect(urls).toContain(MUSIC_URLS['menu-theme']);
    expect(urls.length).toBeGreaterThan(10);
  });

  it('Should skip music and SFX when those toggles are off', () => {
    const urls = criticalBootUrls({ music: false, soundEffects: false });
    expect(urls).not.toContain(MUSIC_URLS['menu-theme']);
    expect(urls).toHaveLength(1);
  });
});

describe('urlsForNextStep', () => {
  it('Should warm play-theme from home, not the whole catalog', () => {
    const urls = urlsForNextStep({
      scene: { screen: 'home', roomClosed: false, view: null },
      raviWho: 'daniel',
      music: true,
      raviVoice: true,
    });
    expect(urls).toEqual([MUSIC_URLS['play-theme']]);
  });

  it('Should warm night-ambient and opening Ravi from the waiting room', () => {
    const urls = urlsForNextStep({
      scene: { screen: 'waiting-room', roomClosed: false, view: makeView() },
      raviWho: 'daniel',
      music: true,
      raviVoice: true,
    });
    expect(urls).toContain(MUSIC_URLS['night-ambient']);
    expect(urls).toContain(RAVI_CLIPS.daniel['deal.start']);
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
});
