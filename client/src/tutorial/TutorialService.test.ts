import { describe, expect, it } from '@rstest/core';
import { Phase } from '@secret-hitler/shared';
import { NavigationService } from '../services/NavigationService';
import { LOOK_BEATS, LOOK_SEAT, buildLookView, effectForLookTarget, LOOK_CAMPAIGN, LOOK_CAMPAIGN_AGAIN, samePitch } from './lookView';
import { en } from '../i18n/locales/en';
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
  it('Should open the table on a recap of the pieces', () => {
    const view = buildLookView({ name: 'You', avatar: 0 }, 0);
    expect(view.players.map((player) => player.name)).toEqual([
      'You',
      'Nima',
      'Sara',
      'Reza',
      'Omid',
    ]);
    expect(view.phase).toBe(Phase.Nomination);
    expect(LOOK_BEATS[0]?.headline).toBe('onboard.idea.welcome');
    expect(LOOK_BEATS[0]?.target).toBe('table');
    expect(view.board.president).toBe(LOOK_SEAT.nima);
    expect(view.players.find((player) => player.id === LOOK_SEAT.nima)?.isPresident).toBe(
      true,
    );
    expect(view.players.find((player) => player.id === LOOK_SEAT.you)?.isPresident).toBe(
      false,
    );
  });

  it('Should keep Nima as president from the first look beat', () => {
    const view = buildLookView({ name: 'You', avatar: 0 }, 0);
    expect(view.board.president).toBe(LOOK_SEAT.nima);
  });

  it('Should name Nima president once people start talking', () => {
    const chatBeat = LOOK_BEATS.findIndex((beat) => beat.target === 'chat');
    const view = buildLookView({ name: 'You', avatar: 0 }, chatBeat);
    expect(view.board.president).toBe(LOOK_SEAT.nima);
    expect(view.board.chancellor).toBeNull();
  });

  it('Should sit the viewer as chancellor on the government beat', () => {
    const governmentBeat = LOOK_BEATS.findIndex((beat) => beat.target === 'government');
    const view = buildLookView({ name: 'You', avatar: 0 }, governmentBeat, {
      picked: true,
    });
    expect(view.board.chancellor).toBe(LOOK_SEAT.you);
    expect(view.board.president).toBe(LOOK_SEAT.nima);
  });

  it('Should name the table object for each look punch-out', () => {
    expect(effectForLookTarget('seats')).toBe('onboard-seats');
    expect(effectForLookTarget('boards')).toBe('onboard-boards');
    expect(effectForLookTarget('president')).toBe('onboard-offices');
    expect(effectForLookTarget('government')).toBe('onboard-offices');
    expect(effectForLookTarget('table')).toBeNull();
    expect(effectForLookTarget('chat')).toBeNull();
    expect(effectForLookTarget('composer')).toBeNull();
  });

  it('Should walk every look beat then remember the step', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    expect(tutorial.looking()).toBe(true);
    expect(tutorial.headlineKey()).toBe(LOOK_BEATS[0].headline);
    expect(tutorial.maskLifted()).toBe(true);

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

  it('Should start five on a night lock, not a nomination lock', () => {
    const tutorial = new TutorialService();
    tutorial.startFive({ name: 'You', avatar: 0 });
    expect(tutorial.lock()).toBe('night');
    expect(tutorial.headlineKey()).toBe('onboard.nightDone');
    tutorial.finishNight();
    expect(tutorial.lock()).toBe('nominate');
    expect(tutorial.headlineKey()).toBe('onboard.pick');
    tutorial.skipFive();
  });

  it('Should let the table campaign for chancellor after night', async () => {
    const tutorial = new TutorialService();
    tutorial.startFive({ name: 'You', avatar: 0 });
    tutorial.finishNight();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(tutorial.talk().some((line) => line.key === 'onboard.talk.pickMe')).toBe(
      true,
    );
    tutorial.skipFive();
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

  it('Should play the campaign then name the viewer chancellor', async () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    const talkIndex = LOOK_BEATS.findIndex((beat) => beat.wait === 'talk');
    for (let index = 0; index < talkIndex; index++) tutorial.advanceLook();
    expect(tutorial.lookWait()).toBe('talk');
    expect(tutorial.canContinueLook()).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tutorial.lookWait()).toBe('say');
    expect(tutorial.talk().map((line) => line.key)).toEqual(
      LOOK_CAMPAIGN.map((line) => line.key),
    );

    const hint = en.onboard.idea.composeHint;
    tutorial.say(hint, hint);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tutorial.talk().some((line) => line.key === 'onboard.talk.badLine')).toBe(
      true,
    );
    expect(tutorial.lookComposeHintKey()).toBe('onboard.idea.composeHint2');
    expect(tutorial.lookWait()).toBe('say');

    const hint2 = en.onboard.idea.composeHint2;
    tutorial.say(hint2, hint2);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tutorial.talk().some((line) => line.key === 'onboard.talk.iPickYou')).toBe(
      true,
    );
    expect(tutorial.target()).toBe('government');
    expect(tutorial.lookView()?.board.chancellor).toBe(LOOK_SEAT.you);
    expect(tutorial.lookView()?.board.president).toBe(LOOK_SEAT.nima);
    tutorial.skipLook();
  });

  it('Should reject a pitch that is not the suggestion then ask again', async () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    const talkIndex = LOOK_BEATS.findIndex((beat) => beat.wait === 'talk');
    for (let index = 0; index < talkIndex; index++) tutorial.advanceLook();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tutorial.lookWait()).toBe('say');

    tutorial.say('put me in', en.onboard.idea.composeHint);
    expect(tutorial.lookWait()).toBe('talk');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tutorial.talk().some((line) => line.key === 'onboard.talk.badLine')).toBe(
      true,
    );
    expect(
      LOOK_CAMPAIGN_AGAIN.every((line) =>
        tutorial.talk().some((spoken) => spoken.key === line.key),
      ),
    ).toBe(true);
    expect(tutorial.lookWait()).toBe('say');
    expect(tutorial.lookComposeHintKey()).toBe('onboard.idea.composeHint2');

    tutorial.say('still no', en.onboard.idea.composeHint2);
    expect(tutorial.headlineKey()).toBe('onboard.idea.writeTheHint');
    expect(tutorial.lookWait()).toBe('say');

    const hint2 = en.onboard.idea.composeHint2;
    tutorial.say(hint2, hint2);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tutorial.target()).toBe('government');
    tutorial.skipLook();
  });

  it('Should treat collapsed spaces as the same pitch', () => {
    expect(samePitch("  Just put me in. I don't care who wins.  ", en.onboard.idea.composeHint)).toBe(
      true,
    );
    expect(samePitch('put me in', en.onboard.idea.composeHint)).toBe(false);
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

describe('TutorialService — count ladder', () => {
  it('Should start six on a delta lock then a term-limit nominate', () => {
    const tutorial = new TutorialService();
    tutorial.startPlay({ name: 'You', avatar: 0 }, 6);
    expect(tutorial.lock()).toBe('delta');
    expect(tutorial.headlineKey()).toBe('onboard.nextSix');
    tutorial.acknowledgeDelta();
    expect(tutorial.lock()).toBe('nominate');
    expect(tutorial.headlineKey()).toBe('onboard.termLimit');
    const nima = tutorial.playView()!.players.find((player) => player.name === 'Nima');
    const sara = tutorial.playView()!.players.find((player) => player.name === 'Sara');
    expect(nima && tutorial.canSelectSeat(nima.id)).toBe(false);
    expect(sara && tutorial.canSelectSeat(sara.id)).toBe(true);
    tutorial.skipPlay();
  });

  it('Should start seven through ten on a delta Continue, not a five-player lecture', () => {
    const tutorial = new TutorialService();
    tutorial.startPlay({ name: 'You', avatar: 0 }, 7);
    expect(tutorial.lock()).toBe('delta');
    expect(tutorial.headlineKey()).toBe('onboard.nextSeven');
    tutorial.startPlay({ name: 'You', avatar: 0 }, 8);
    expect(tutorial.headlineKey()).toBe('onboard.nextEight');
    tutorial.startPlay({ name: 'You', avatar: 0 }, 9);
    expect(tutorial.headlineKey()).toBe('onboard.nextNine');
    tutorial.startPlay({ name: 'You', avatar: 0 }, 10);
    expect(tutorial.headlineKey()).toBe('onboard.nextTen');
    tutorial.skipPlay();
  });

  it('Should not advance the ladder without a finished hand', () => {
    const tutorial = new TutorialService();
    tutorial.startPlay({ name: 'You', avatar: 0 }, 6);
    expect(tutorial.continueLadder()).toBe(false);
    tutorial.skipPlay();
  });
});
