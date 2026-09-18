import { describe, expect, it } from '@rstest/core';
import { Phase } from '@secret-hitler/shared';
import { NavigationService } from '../services/NavigationService';
import { LOOK_BEATS, LOOK_SEAT, buildLookView, effectForLookTarget, LOOK_CAMPAIGN } from './lookView';
import { portraitGender } from '../assets/avatars';
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

  it('Should sit men on man names and women on woman names', () => {
    const view = buildLookView({ name: 'You', avatar: 0 }, 0);
    const nima = view.players.find((player) => player.id === LOOK_SEAT.nima);
    const sara = view.players.find((player) => player.id === LOOK_SEAT.sara);
    const reza = view.players.find((player) => player.id === LOOK_SEAT.reza);
    const omid = view.players.find((player) => player.id === LOOK_SEAT.omid);
    expect(portraitGender(nima?.avatar ?? -1)).toBe('man');
    expect(portraitGender(sara?.avatar ?? -1)).toBe('woman');
    expect(portraitGender(reza?.avatar ?? -1)).toBe('man');
    expect(portraitGender(omid?.avatar ?? -1)).toBe('man');
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
    expect(effectForLookTarget('messages')).toBeNull();
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
    expect(tutorial.lock()).toBeNull();
    expect(tutorial.headlineKey()).toBe('onboard.youPresident');
    expect(tutorial.maskLifted()).toBe(true);
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
    expect(tutorial.lock()).toBe('nominate');
    expect(tutorial.headlineKey()).toBe('onboard.pick');
    expect(tutorial.target()).toBe('nima');
    expect(tutorial.passHole()).toBe(true);
    tutorial.skipFive();
  });

  it('Should nominate Nima once the pick lock is on', async () => {
    const tutorial = new TutorialService();
    tutorial.startFive({ name: 'You', avatar: 0 });
    tutorial.finishNight();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const nima = tutorial.playView()?.players.find((player) => player.name === 'Nima');
    expect(nima).toBeTruthy();
    expect(tutorial.isNominateHintSeat(nima!.id)).toBe(true);
    expect(tutorial.handlePlay({ kind: 'nominateChancellor', targetId: nima!.id })).toBe(
      true,
    );
    expect(tutorial.playView()?.board.chancellor).toBe(nima!.id);
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

  it('Should skip a look beat without leaving the table', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    expect(tutorial.skipLookBeat()).toBe(false);
    expect(tutorial.looking()).toBe(true);
    expect(tutorial.headlineKey()).toBe(LOOK_BEATS[1].headline);
    tutorial.skipLook();
  });

  it('Should skip the first write wait onto where-were-we', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    const tryIndex = LOOK_BEATS.findIndex((beat) => beat.wait === 'try');
    for (let index = 0; index < tryIndex; index++) tutorial.advanceLook();
    expect(tutorial.lookWait()).toBe('try');
    expect(tutorial.skipLookBeat()).toBe(false);
    expect(tutorial.headlineKey()).toBe('onboard.idea.whereWereWe');
    expect(tutorial.maskLifted()).toBe(true);
    tutorial.skipLook();
  });

  it('Should lift on lets-listen then ring chat when the table talks', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    const talkAbout = LOOK_BEATS.findIndex(
      (beat) => beat.headline === 'onboard.idea.talkAbout' && beat.wait === 'continue',
    );
    for (let index = 0; index < talkAbout; index++) tutorial.advanceLook();
    expect(tutorial.headlineKey()).toBe('onboard.idea.talkAbout');
    expect(tutorial.maskLifted()).toBe(true);
    expect(tutorial.advanceLook()).toBe(false);
    expect(tutorial.lookWait()).toBe('talk');
    expect(tutorial.target()).toBe('chat');
    expect(tutorial.maskLifted()).toBe(false);
    tutorial.skipLook();
  });

  it('Should skip the campaign wait and ask the viewer to write', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    const talkIndex = LOOK_BEATS.findIndex((beat) => beat.wait === 'talk');
    for (let index = 0; index < talkIndex; index++) tutorial.advanceLook();
    expect(tutorial.lookWait()).toBe('talk');
    expect(tutorial.skipLookBeat()).toBe(false);
    expect(tutorial.lookWait()).toBe('say');
    expect(tutorial.headlineKey()).toBe('onboard.idea.yourTurn');
    tutorial.skipLook();
  });

  it('Should lift after the viewer first line then pick the lesson back up', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    const tryIndex = LOOK_BEATS.findIndex((beat) => beat.wait === 'try');
    for (let index = 0; index < tryIndex; index++) tutorial.advanceLook();
    expect(tutorial.lookWait()).toBe('try');
    expect(tutorial.canContinueLook()).toBe(false);
    expect(tutorial.lookTyping()).toBe(true);
    expect(tutorial.lookComposeHint()).toBe(false);

    tutorial.say('hello there');
    expect(tutorial.headlineKey()).toBe('onboard.idea.whereWereWe');
    expect(tutorial.maskLifted()).toBe(true);
    expect(tutorial.talk().some((line) => line.text === 'hello there')).toBe(true);
    expect(tutorial.lookWait()).toBe('pause');

    tutorial.lookHeadlineFinished();
    expect(tutorial.headlineKey()).toBe('onboard.idea.whereWereWe');

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(tutorial.headlineKey()).toBe('onboard.idea.campaign');
        expect(tutorial.maskLifted()).toBe(true);
        expect(tutorial.talk().some((line) => line.text === 'hello there')).toBe(true);
        tutorial.skipLook();
        resolve();
      }, 20);
    });
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

    expect(tutorial.lookComposeHintKey()).toBe('onboard.idea.composeHint');
    tutorial.say('count me in');
    expect(tutorial.maskLifted()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tutorial.talk().some((line) => line.text === 'count me in')).toBe(true);
    expect(tutorial.talk().some((line) => line.key === 'onboard.talk.iPickYou')).toBe(
      true,
    );
    expect(tutorial.target()).toBe('government');
    expect(tutorial.lookView()?.board.chancellor).toBe(LOOK_SEAT.you);
    expect(tutorial.lookView()?.board.president).toBe(LOOK_SEAT.nima);
    tutorial.skipLook();
  });

  it('Should accept any pitch then name the viewer chancellor', async () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    const talkIndex = LOOK_BEATS.findIndex((beat) => beat.wait === 'talk');
    for (let index = 0; index < talkIndex; index++) tutorial.advanceLook();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tutorial.lookWait()).toBe('say');

    tutorial.say('whatever I want');
    expect(tutorial.maskLifted()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tutorial.talk().some((line) => line.text === 'whatever I want')).toBe(true);
    expect(tutorial.talk().some((line) => line.key === 'onboard.talk.iPickYou')).toBe(
      true,
    );
    expect(tutorial.target()).toBe('government');
    tutorial.skipLook();
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

  it('Should skip a five-player table onto six', () => {
    const tutorial = new TutorialService();
    tutorial.startPlay({ name: 'You', avatar: 0 }, 5);
    expect(tutorial.skipToNextPlay()).toBe(true);
    expect(tutorial.playing()).toBe(true);
    expect(tutorial.headlineKey()).toBe('onboard.nextSix');
    tutorial.skipPlay();
  });
});
