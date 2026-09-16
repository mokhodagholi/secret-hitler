import { describe, expect, it } from '@rstest/core';
import { NavigationService } from '../services/NavigationService';
import { LOOK_BEATS, LOOK_SEAT, buildLookView } from './lookView';
import {
  ONBOARDING_DECLINE_KEY,
  ONBOARDING_STEP_KEY,
  TUTORIAL_ANNOUNCE_LIMIT,
  TUTORIAL_SEEN_COUNT_KEY,
  TutorialService,
} from './TutorialService';

describe('TutorialService — first-run sit', () => {
  it('Should offer the table for the first five launches', () => {
    const tutorial = new TutorialService();
    expect(tutorial.shouldOffer()).toBe(true);
    expect(tutorial.seenCount()).toBe(0);

    for (let launch = 1; launch <= TUTORIAL_ANNOUNCE_LIMIT; launch++) {
      const service = launch === 1 ? tutorial : new TutorialService();
      const nav = new NavigationService('/');
      expect(service.offerAfterSplash(nav, false, true)).toBe(true);
      expect(nav.screen()).toBe('home');
      expect(service.offeringSit()).toBe(true);
      service.declineSit();
      expect(service.declineCount()).toBe(launch);
      expect(service.offeringSit()).toBe(false);
    }

    expect(new TutorialService().shouldOffer()).toBe(false);
  });

  it('Should stop offering after five look declines', () => {
    localStorage.setItem(ONBOARDING_DECLINE_KEY, String(TUTORIAL_ANNOUNCE_LIMIT));
    const tutorial = new TutorialService();
    const nav = new NavigationService('/');
    expect(tutorial.offerAfterSplash(nav, false, true)).toBe(false);
    expect(nav.screen()).toBe('home');
    expect(tutorial.offeringSit()).toBe(false);
  });

  it('Should persist the seen count across a fresh service', () => {
    const tutorial = new TutorialService();
    tutorial.beginAnnouncement();
    tutorial.dismissAnnouncement();
    expect(localStorage.getItem(TUTORIAL_SEEN_COUNT_KEY)).toBe('1');
    expect(new TutorialService().seenCount()).toBe(1);
  });

  it('Should not steal a live seat or a join screen', () => {
    const tutorial = new TutorialService();
    const home = new NavigationService('/');
    expect(tutorial.offerAfterSplash(home, true, true)).toBe(false);
    expect(home.screen()).toBe('home');

    const join = new NavigationService('/join/ABC123');
    expect(tutorial.offerAfterSplash(join, false, true)).toBe(false);
    expect(join.screen()).toBe('join-game');
    expect(tutorial.offeringSit()).toBe(false);
  });

  it('Should increment only once when the banner is dismissed twice', () => {
    const tutorial = new TutorialService();
    tutorial.beginAnnouncement();
    tutorial.dismissAnnouncement();
    tutorial.dismissAnnouncement();
    expect(tutorial.seenCount()).toBe(1);
  });

  it('Should treat corrupt storage as unseen', () => {
    localStorage.setItem(TUTORIAL_SEEN_COUNT_KEY, 'nope');
    const tutorial = new TutorialService();
    expect(tutorial.seenCount()).toBe(0);
    expect(tutorial.shouldOffer()).toBe(true);
  });

  it('Should still offer the look after the old rules hub was seen five times', () => {
    localStorage.setItem(TUTORIAL_SEEN_COUNT_KEY, String(TUTORIAL_ANNOUNCE_LIMIT));
    const tutorial = new TutorialService();
    const nav = new NavigationService('/');
    expect(tutorial.offerAfterSplash(nav, false, true)).toBe(true);
  });

  it('Should stay quiet when the onboarding flag is off', () => {
    const tutorial = new TutorialService();
    const nav = new NavigationService('/');
    expect(tutorial.offerAfterSplash(nav, false, false)).toBe(false);
    expect(tutorial.offeringSit()).toBe(false);
    expect(nav.screen()).toBe('home');
  });

  it('Should offer once the flag turns on after a quiet launch', () => {
    const tutorial = new TutorialService();
    const nav = new NavigationService('/');
    expect(tutorial.offerAfterSplash(nav, false, false)).toBe(false);
    expect(tutorial.offerAfterSplash(nav, false, true)).toBe(true);
  });

  it('Should not ask twice in the same visit', () => {
    const tutorial = new TutorialService();
    const nav = new NavigationService('/');
    expect(tutorial.offerAfterSplash(nav, false, true)).toBe(true);
    tutorial.declineSit();
    expect(tutorial.offerAfterSplash(nav, false, true)).toBe(false);
  });
});

describe('TutorialService — look', () => {
  it('Should stage five named seats with a government and one Ja', () => {
    const view = buildLookView({ name: 'You', avatar: 0 });
    expect(view.players.map((player) => player.name)).toEqual([
      'You',
      'Nima',
      'Sara',
      'Reza',
      'Omid',
    ]);
    expect(view.board.president).toBe(LOOK_SEAT.you);
    expect(view.board.chancellor).toBe(LOOK_SEAT.nima);
    expect(view.players.find((player) => player.id === LOOK_SEAT.sara)?.vote).toBe(
      'ja',
    );
  });

  it('Should walk every look beat then remember the step', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    expect(tutorial.looking()).toBe(true);
    expect(tutorial.headlineKey()).toBe(LOOK_BEATS[0].headline);

    for (let index = 1; index < LOOK_BEATS.length; index++) {
      expect(tutorial.advanceLook()).toBe(false);
      expect(tutorial.headlineKey()).toBe(LOOK_BEATS[index].headline);
    }

    expect(tutorial.advanceLook()).toBe(true);
    expect(tutorial.looking()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBe('1');
    tutorial.closeLook();
    expect(tutorial.looking()).toBe(false);
    expect(new TutorialService().shouldOffer()).toBe(false);
  });

  it('Should skip without marking the look complete', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    tutorial.skipLook();
    expect(tutorial.looking()).toBe(false);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBeNull();
    expect(tutorial.declineCount()).toBe(1);
    expect(new TutorialService().shouldOffer()).toBe(true);
  });
});
