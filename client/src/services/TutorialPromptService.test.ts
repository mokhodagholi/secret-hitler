import { describe, expect, it } from '@rstest/core';
import { NavigationService } from './NavigationService';
import {
  TUTORIAL_ANNOUNCE_LIMIT,
  TUTORIAL_SEEN_COUNT_KEY,
  TutorialPromptService,
} from './TutorialPromptService';

describe('TutorialPromptService', () => {
  it('Should offer the guide for the first five launches', () => {
    const tutorial = new TutorialPromptService();
    expect(tutorial.shouldOffer()).toBe(true);
    expect(tutorial.seenCount()).toBe(0);

    for (let launch = 1; launch <= TUTORIAL_ANNOUNCE_LIMIT; launch++) {
      const service = launch === 1 ? tutorial : new TutorialPromptService();
      const nav = new NavigationService('/');
      expect(service.offerAfterSplash(nav, false)).toBe(true);
      expect(nav.screen()).toBe('rules');
      expect(service.announcing()).toBe(true);
      service.dismissAnnouncement();
      expect(service.seenCount()).toBe(launch);
      expect(service.announcing()).toBe(false);
    }

    expect(new TutorialPromptService().shouldOffer()).toBe(false);
  });

  it('Should stop offering after five dismissals', () => {
    localStorage.setItem(TUTORIAL_SEEN_COUNT_KEY, String(TUTORIAL_ANNOUNCE_LIMIT));
    const tutorial = new TutorialPromptService();
    const nav = new NavigationService('/');
    expect(tutorial.offerAfterSplash(nav, false)).toBe(false);
    expect(nav.screen()).toBe('home');
    expect(tutorial.announcing()).toBe(false);
  });

  it('Should persist the seen count across a fresh service', () => {
    const tutorial = new TutorialPromptService();
    tutorial.beginAnnouncement();
    tutorial.dismissAnnouncement();
    expect(localStorage.getItem(TUTORIAL_SEEN_COUNT_KEY)).toBe('1');
    expect(new TutorialPromptService().seenCount()).toBe(1);
  });

  it('Should not steal a live seat or a join screen', () => {
    const tutorial = new TutorialPromptService();
    const home = new NavigationService('/');
    expect(tutorial.offerAfterSplash(home, true)).toBe(false);
    expect(home.screen()).toBe('home');

    const join = new NavigationService('/join/ABC123');
    expect(tutorial.offerAfterSplash(join, false)).toBe(false);
    expect(join.screen()).toBe('join-game');
    expect(tutorial.announcing()).toBe(false);
  });

  it('Should increment only once when the banner is dismissed twice', () => {
    const tutorial = new TutorialPromptService();
    tutorial.beginAnnouncement();
    tutorial.dismissAnnouncement();
    tutorial.dismissAnnouncement();
    expect(tutorial.seenCount()).toBe(1);
  });

  it('Should treat corrupt storage as unseen', () => {
    localStorage.setItem(TUTORIAL_SEEN_COUNT_KEY, 'nope');
    const tutorial = new TutorialPromptService();
    expect(tutorial.seenCount()).toBe(0);
    expect(tutorial.shouldOffer()).toBe(true);
  });
});
