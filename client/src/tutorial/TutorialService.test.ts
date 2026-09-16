import { describe, expect, it } from '@rstest/core';
import { Phase } from '@secret-hitler/shared';
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
  it('Should stage the government ticket on the first look beat', () => {
    const view = buildLookView({ name: 'You', avatar: 0 }, 0);
    expect(view.players.map((player) => player.name)).toEqual([
      'You',
      'Nima',
      'Sara',
      'Reza',
      'Omid',
    ]);
    expect(view.phase).toBe(Phase.Nomination);
    expect(view.board.president).toBe(LOOK_SEAT.you);
    expect(view.board.chancellor).toBe(LOOK_SEAT.nima);
  });

  it('Should stage the vote dialog with a president and chancellor', () => {
    const voteBeat = LOOK_BEATS.findIndex((beat) => beat.target === 'vote');
    const view = buildLookView({ name: 'You', avatar: 0 }, voteBeat);
    expect(view.phase).toBe(Phase.Voting);
    expect(view.board.president).toBe(LOOK_SEAT.you);
    expect(view.board.chancellor).toBe(LOOK_SEAT.nima);
    expect(view.voteDeadline).not.toBeNull();
    expect(view.you.vote).toBeNull();
  });

  it('Should stage face-up ballots for the ballots beat', () => {
    const ballotsBeat = LOOK_BEATS.findIndex((beat) => beat.target === 'ballots');
    const view = buildLookView({ name: 'You', avatar: 0 }, ballotsBeat);
    expect(view.players.every((player) => player.vote != null)).toBe(true);
    expect(view.players.find((player) => player.id === LOOK_SEAT.reza)?.vote).toBe(
      'nein',
    );
  });

  it('Should stage a failed majority and light tracker marks across the fail beats', () => {
    const fail1 = LOOK_BEATS.findIndex(
      (beat) => beat.headline === 'onboard.idea.trackerFail1',
    );
    const next = LOOK_BEATS.findIndex(
      (beat) => beat.headline === 'onboard.idea.nextPresident',
    );
    const fail2 = LOOK_BEATS.findIndex(
      (beat) => beat.headline === 'onboard.idea.trackerFail2',
    );
    const chaos = LOOK_BEATS.findIndex(
      (beat) => beat.headline === 'onboard.idea.trackerChaos',
    );

    const fail1View = buildLookView({ name: 'You', avatar: 0 }, fail1);
    expect(fail1View.board.electionTracker).toBe(1);
    expect(
      fail1View.players.filter((player) => player.vote === 'nein').length,
    ).toBe(3);

    const nextView = buildLookView({ name: 'You', avatar: 0 }, next);
    expect(nextView.board.electionTracker).toBe(1);
    expect(nextView.board.president).toBe(LOOK_SEAT.nima);
    expect(nextView.players.find((player) => player.id === LOOK_SEAT.nima)?.isPresident).toBe(
      true,
    );

    expect(buildLookView({ name: 'You', avatar: 0 }, fail2).board.electionTracker).toBe(2);
    expect(buildLookView({ name: 'You', avatar: 0 }, chaos).board.electionTracker).toBe(3);
  });

  it('Should stage three policy tiles for the laws beat', () => {
    const lawsBeat = LOOK_BEATS.findIndex((beat) => beat.target === 'laws');
    const view = buildLookView({ name: 'You', avatar: 0 }, lawsBeat);
    expect(view.phase).toBe(Phase.PresidentLegislative);
    expect(view.you.policies).toEqual(['liberal', 'fascist', 'liberal']);
  });

  it('Should walk every look beat then remember the step', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    expect(tutorial.looking()).toBe(true);
    expect(tutorial.headlineKey()).toBe(LOOK_BEATS[0].headline);

    for (let index = 1; index < LOOK_BEATS.length; index++) {
      expect(tutorial.advanceLook()).toBe(false);
      expect(tutorial.headlineKey()).toBe(LOOK_BEATS[index].headline);
      expect(tutorial.target()).toBe(LOOK_BEATS[index].target);
    }

    expect(tutorial.advanceLook()).toBe(true);
    expect(tutorial.looking()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBe('1');
    tutorial.startFive({ name: 'You', avatar: 0 });
    expect(tutorial.looking()).toBe(false);
    expect(tutorial.playing()).toBe(true);
    tutorial.skipFive();
    expect(tutorial.playing()).toBe(false);
    expect(new TutorialService().shouldOffer()).toBe(false);
  });

  it('Should retreat to the previous look beat', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    expect(tutorial.beat()).toBe(0);
    tutorial.retreatLook();
    expect(tutorial.beat()).toBe(0);
    expect(tutorial.advanceLook()).toBe(false);
    expect(tutorial.beat()).toBe(1);
    expect(tutorial.target()).toBe(LOOK_BEATS[1].target);
    tutorial.retreatLook();
    expect(tutorial.beat()).toBe(0);
    expect(tutorial.target()).toBe(LOOK_BEATS[0].target);
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
