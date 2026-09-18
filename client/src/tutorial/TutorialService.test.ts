import { describe, expect, it } from '@rstest/core';
import { Phase } from '@secret-hitler/shared';
import { NavigationService } from '../services/NavigationService';
import { LOOK_BEATS, LOOK_SEAT, buildLookView, effectForLookTarget, LOOK_CAMPAIGN, type LookWait } from './lookView';
import { portraitGender } from '../assets/avatars';
import {
  ONBOARDING_DECLINE_KEY,
  ONBOARDING_HOME_HISTORY_KEY,
  ONBOARDING_HOME_SETTINGS_KEY,
  ONBOARDING_STEP_KEY,
  TUTORIAL_ANNOUNCE_LIMIT,
  TUTORIAL_SEEN_COUNT_KEY,
  TutorialService,
} from './TutorialService';
import { HISTORY_ADD_ACCOUNT, HISTORY_BEATS } from './historyView';

function afterSitDeclined(): TutorialService {
  const tutorial = new TutorialService();
  tutorial.offerAfterSplash(new NavigationService('/'), false, true);
  tutorial.declineSit();
  return tutorial;
}

async function waitForLock(
  tutorial: TutorialService,
  lock: string | null,
): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (tutorial.lock() === lock) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`expected lock ${lock}, got ${tutorial.lock()}`);
}

async function waitForLookWait(
  tutorial: TutorialService,
  wait: LookWait,
): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (tutorial.lookWait() === wait) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`expected look wait ${wait}, got ${tutorial.lookWait()}`);
}

async function waitForHeadline(
  tutorial: TutorialService,
  key: string,
): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (tutorial.headlineKey() === key) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`expected headline ${key}, got ${tutorial.headlineKey()}`);
}

async function playFirstGovernment(tutorial: TutorialService): Promise<void> {
  tutorial.finishNight();
  await waitForLock(tutorial, 'openNominate');
  const nima = tutorial.playView()!.players.find((player) => player.name === 'Nima')!;
  expect(tutorial.handlePlay({ kind: 'endTurn' })).toBe(true);
  expect(tutorial.handlePlay({ kind: 'nominateChancellor', targetId: nima.id })).toBe(
    true,
  );
  await waitForLock(tutorial, 'voteJa');
  expect(tutorial.handlePlay({ kind: 'castVote', vote: 'ja' })).toBe(true);
  await waitForLock(tutorial, 'burnFascist');
  const anyLaw = tutorial.playView()!.you.policies.length > 0 ? 0 : -1;
  expect(anyLaw).toBeGreaterThanOrEqual(0);
  expect(tutorial.handlePlay({ kind: 'discardPolicy', index: anyLaw })).toBe(true);
}

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

describe('TutorialService — home settings', () => {
  it('Should wait until Sit is gone before ringing the home gear', () => {
    const tutorial = new TutorialService();
    const nav = new NavigationService('/');
    expect(tutorial.beginHomeSettings()).toBe(false);
    expect(tutorial.offerAfterSplash(nav, false, true)).toBe(true);
    expect(tutorial.beginHomeSettings()).toBe(false);
    tutorial.declineSit();
    expect(tutorial.beginHomeSettings()).toBe(true);
    expect(tutorial.headlineKey()).toBe('onboard.idea.homeSettings');
    expect(tutorial.openHomeSettings()).toBe(true);
    expect(tutorial.guidingHome()).toBe(true);
    expect(tutorial.headlineKey()).toBe('onboard.settings.name');
    expect(localStorage.getItem(ONBOARDING_HOME_SETTINGS_KEY)).toBeNull();
    expect(tutorial.beginHomeSettings()).toBe(false);
  });

  it('Should remember Skip so the home gear is not asked again', () => {
    const tutorial = afterSitDeclined();
    expect(tutorial.beginHomeSettings()).toBe(true);
    tutorial.skipHomeSettings();
    expect(tutorial.guidingHome()).toBe(false);
    expect(localStorage.getItem(ONBOARDING_HOME_SETTINGS_KEY)).toBe('1');
    expect(new TutorialService().beginHomeSettings()).toBe(false);
  });

  it('Should ring the home gear again from a forced start', () => {
    const tutorial = new TutorialService();
    localStorage.setItem(ONBOARDING_HOME_SETTINGS_KEY, '1');
    tutorial.startHomeHistory({ name: 'Ana', avatar: 0 });
    expect(tutorial.beginHomeSettings()).toBe(false);
    tutorial.startHomeSettings();
    expect(tutorial.guidingHome()).toBe(true);
    expect(tutorial.reviewingHistory()).toBe(false);
    expect(tutorial.headlineKey()).toBe('onboard.idea.homeSettings');
  });

  it('Should walk every Settings row then remember the gear is done', () => {
    const tutorial = afterSitDeclined();
    expect(tutorial.beginHomeSettings()).toBe(true);
    expect(tutorial.openHomeSettings()).toBe(true);
    expect(tutorial.settingsPage()).toBe(true);
    const headlines: string[] = [];
    while (tutorial.guidingHome() && tutorial.canContinueHomeSettings()) {
      headlines.push(tutorial.headlineKey());
      tutorial.advanceHomeSettings();
    }
    expect(headlines).toContain('onboard.settings.name');
    expect(headlines).toContain('onboard.settings.done');
    expect(headlines).not.toContain('onboard.settings.table');
    expect(tutorial.guidingHome()).toBe(false);
    expect(localStorage.getItem(ONBOARDING_HOME_SETTINGS_KEY)).toBe('1');
  });

  it('Should name the table mic when voice is on', () => {
    const tutorial = new TutorialService();
    tutorial.startHomeSettings({ voice: true });
    tutorial.openHomeSettings();
    const headlines: string[] = [];
    while (tutorial.guidingHome()) {
      headlines.push(tutorial.headlineKey());
      tutorial.advanceHomeSettings();
    }
    expect(headlines).toContain('onboard.settings.table');
    expect(headlines.at(-1)).toBe('onboard.settings.done');
  });
});

describe('TutorialService — home history', () => {
  it('Should wait until the home gear is done before opening History', () => {
    const tutorial = afterSitDeclined();
    const you = { name: 'Ana', avatar: 0 };
    expect(tutorial.beginHomeHistory(you)).toBe(false);
    expect(tutorial.beginHomeSettings()).toBe(true);
    expect(tutorial.beginHomeHistory(you)).toBe(false);
    tutorial.skipHomeSettings();
    expect(tutorial.beginHomeHistory(you)).toBe(true);
    expect(tutorial.headlineKey()).toBe('onboard.history.chip');
    expect(tutorial.historySheet()).toBe(false);
    expect(tutorial.openHistoryChip()).toBe(true);
    expect(tutorial.historySheet()).toBe(true);
    expect(tutorial.historyMatches()).toHaveLength(1);
  });

  it('Should teach Add on Reza, then close and reopen onto a loss, and remember Skip', () => {
    const tutorial = new TutorialService();
    localStorage.setItem(ONBOARDING_HOME_SETTINGS_KEY, '1');
    tutorial.startHomeHistory({ name: 'Ana', avatar: 0 });
    expect(tutorial.openHistoryChip()).toBe(true);
    expect(tutorial.historyMatches()).toHaveLength(1);
    while (tutorial.reviewingHistory() && tutorial.canContinueHomeHistory()) {
      tutorial.advanceHomeHistory();
    }
    expect(tutorial.headlineKey()).toBe('onboard.history.add');
    expect(tutorial.addHistoryFriend('look-history-maryam')).toBe(false);
    expect(tutorial.addHistoryFriend(HISTORY_ADD_ACCOUNT)).toBe(true);
    expect(tutorial.historyTie(HISTORY_ADD_ACCOUNT)).toBe('outgoing');
    expect(tutorial.headlineKey()).toBe('onboard.history.sent');
    expect(tutorial.advanceHomeHistory()).toBe(false);
    expect(tutorial.headlineKey()).toBe('onboard.history.ties');
    expect(tutorial.advanceHomeHistory()).toBe(false);
    expect(tutorial.headlineKey()).toBe('onboard.history.close');
    expect(tutorial.closeHistorySheet()).toBe(true);
    expect(tutorial.headlineKey()).toBe('onboard.history.loss');
    expect(tutorial.historySheet()).toBe(false);
    expect(tutorial.historyMatches()).toHaveLength(1);
    expect(tutorial.openHistoryChip()).toBe(true);
    expect(tutorial.headlineKey()).toBe('onboard.history.lossCard');
    expect(tutorial.historyMatches()).toHaveLength(2);
    expect(tutorial.historyExpandIds()).toEqual(['look-history-loss']);
    tutorial.skipHomeHistory();
    expect(tutorial.reviewingHistory()).toBe(false);
    expect(localStorage.getItem(ONBOARDING_HOME_HISTORY_KEY)).toBe('1');
    expect(new TutorialService().beginHomeHistory({ name: 'Ana', avatar: 0 })).toBe(
      false,
    );
    expect(HISTORY_BEATS.length).toBeGreaterThan(8);
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

  it('Should deal three laws then hand two to the chancellor', () => {
    const dealBeat = LOOK_BEATS.findIndex(
      (beat) => beat.headline === 'onboard.idea.onlyPresidentSees',
    );
    const passBeat = LOOK_BEATS.findIndex(
      (beat) => beat.headline === 'onboard.idea.presidentBurns',
    );
    const enactBeat = LOOK_BEATS.findIndex(
      (beat) => beat.headline === 'onboard.idea.youPickLaw',
    );
    const deal = buildLookView({ name: 'You', avatar: 0 }, dealBeat, { picked: true });
    expect(deal.phase).toBe(Phase.PresidentLegislative);
    expect(deal.you.policies).toEqual([]);
    const pass = buildLookView({ name: 'You', avatar: 0 }, passBeat, { picked: true });
    expect(pass.phase).toBe(Phase.ChancellorLegislative);
    expect(pass.you.policies).toEqual([]);
    const enact = buildLookView({ name: 'You', avatar: 0 }, enactBeat, { picked: true });
    expect(enact.phase).toBe(Phase.ChancellorLegislative);
    expect(enact.you.policies).toEqual(['liberal', 'fascist']);
  });

  it('Should name the table object for each look punch-out', () => {
    expect(effectForLookTarget('seats')).toBe('onboard-seats');
    expect(effectForLookTarget('boards')).toBe('onboard-boards');
    expect(effectForLookTarget('president')).toBe('onboard-offices');
    expect(effectForLookTarget('laws')).toBe('onboard-laws');
    expect(effectForLookTarget('table')).toBeNull();
    expect(effectForLookTarget('chat')).toBeNull();
    expect(effectForLookTarget('messages')).toBeNull();
    expect(effectForLookTarget('composer')).toBeNull();
    expect(effectForLookTarget('settings')).toBeNull();
    expect(effectForLookTarget('menu')).toBeNull();
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

  it('Should start five on a night lock, then lift for the real table', () => {
    const tutorial = new TutorialService();
    tutorial.startFive({ name: 'You', avatar: 0 });
    expect(tutorial.lock()).toBe('night');
    expect(tutorial.guidesHeader()).toBe(false);
    tutorial.finishNight();
    expect(tutorial.lock()).toBeNull();
    expect(tutorial.headlineKey()).toBe('onboard.youPresident');
    expect(tutorial.guidesHeader()).toBe(true);
    expect(tutorial.maskLifted()).toBe(true);
    tutorial.skipFive();
  });

  it('Should let the table campaign for chancellor after night', async () => {
    const tutorial = new TutorialService();
    tutorial.startFive({ name: 'You', avatar: 0 });
    tutorial.finishNight();
    await waitForLock(tutorial, 'openNominate');
    expect(tutorial.talk().some((line) => line.key === 'onboard.talk.pickMe')).toBe(
      true,
    );
    expect(tutorial.headlineKey()).toBe('onboard.mustNominate');
    expect(tutorial.target()).toBe('nominateAction');
    expect(tutorial.passHole()).toBe(true);
    tutorial.skipFive();
  });

  it('Should nominate Nima once the pick lock is on', async () => {
    const tutorial = new TutorialService();
    tutorial.startFive({ name: 'You', avatar: 0 });
    tutorial.finishNight();
    await waitForLock(tutorial, 'openNominate');
    const nima = tutorial.playView()?.players.find((player) => player.name === 'Nima');
    expect(nima).toBeTruthy();
    expect(
      tutorial.handlePlay({ kind: 'nominateChancellor', targetId: nima!.id }),
    ).toBe(false);
    expect(tutorial.handlePlay({ kind: 'endTurn' })).toBe(true);
    expect(tutorial.lock()).toBe('nominate');
    expect(tutorial.headlineKey()).toBe('onboard.pick');
    expect(tutorial.isNominateHintSeat(nima!.id)).toBe(true);
    expect(tutorial.handlePlay({ kind: 'nominateChancellor', targetId: nima!.id })).toBe(
      true,
    );
    expect(tutorial.playView()?.board.chancellor).toBe(nima!.id);
    tutorial.skipFive();
  });

  it('Should reject Nein on the first government and keep the Ja lock', async () => {
    const tutorial = new TutorialService();
    tutorial.startFive({ name: 'You', avatar: 0 });
    tutorial.finishNight();
    await waitForLock(tutorial, 'openNominate');
    const nima = tutorial.playView()?.players.find((player) => player.name === 'Nima');
    expect(nima).toBeTruthy();
    expect(tutorial.handlePlay({ kind: 'endTurn' })).toBe(true);
    expect(tutorial.handlePlay({ kind: 'nominateChancellor', targetId: nima!.id })).toBe(
      true,
    );
    await waitForLock(tutorial, 'voteJa');
    expect(tutorial.handlePlay({ kind: 'castVote', vote: 'nein' })).toBe(false);
    expect(tutorial.headlineKey()).toBe('onboard.voteRetry');
    expect(tutorial.lock()).toBe('voteJa');
    expect(tutorial.playView()?.you.vote).toBeNull();
    expect(tutorial.handlePlay({ kind: 'castVote', vote: 'ja' })).toBe(true);
    expect(tutorial.playView()?.you.vote).toBe('ja');
    tutorial.skipFive();
  });

  it('Should blur coming-soon after the first government', async () => {
    const tutorial = new TutorialService();
    tutorial.startFive({ name: 'You', avatar: 0 });
    await playFirstGovernment(tutorial);
    await waitForHeadline(tutorial, 'onboard.comingSoon');
    expect(tutorial.playSoon()).toBe(true);
    expect(tutorial.blurred()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBe('2');
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

  it('Should skip the look table onto the five-player hand', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    expect(tutorial.skipLookBeat()).toBe(true);
    expect(tutorial.looking()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBe('1');
    tutorial.startFive({ name: 'You', avatar: 0 });
    expect(tutorial.looking()).toBe(false);
    expect(tutorial.playing()).toBe(true);
    expect(tutorial.lock()).toBe('night');
    tutorial.skipFive();
  });

  it('Should wait for the gear then show the settings sheet', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    tutorial.openLookSettings();
    expect(tutorial.target()).toBe('table');

    const settingsIndex = LOOK_BEATS.findIndex((beat) => beat.target === 'settings');
    for (let index = 0; index < settingsIndex; index++) tutorial.advanceLook();
    expect(tutorial.headlineKey()).toBe('onboard.idea.settings');
    expect(tutorial.lookWait()).toBe('open');
    expect(tutorial.canContinueLook()).toBe(false);
    expect(tutorial.passHole()).toBe(true);
    expect(tutorial.lookMenu()).toBe(false);

    tutorial.openLookSettings();
    expect(tutorial.headlineKey()).toBe('onboard.idea.settingsMenu');
    expect(tutorial.target()).toBe('menu');
    expect(tutorial.lookMenu()).toBe(true);
    expect(tutorial.canContinueLook()).toBe(true);
    expect(tutorial.passHole()).toBe(false);

    tutorial.retreatLook();
    expect(tutorial.target()).toBe('settings');
    expect(tutorial.lookMenu()).toBe(false);
    tutorial.openLookSettings();
    expect(tutorial.lookMenu()).toBe(true);
    tutorial.skipLook();
  });

  it('Should lift on lets-listen then ring chat when the table talks', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    const talkAbout = LOOK_BEATS.findIndex(
      (beat) => beat.headline === 'onboard.idea.talkAbout' && beat.wait === 'pause',
    );
    for (let index = 0; index < talkAbout; index++) tutorial.advanceLook();
    expect(tutorial.headlineKey()).toBe('onboard.idea.talkAbout');
    expect(tutorial.maskLifted()).toBe(true);
    expect(tutorial.canContinueLook()).toBe(false);
    expect(tutorial.advanceLook()).toBe(false);
    expect(tutorial.lookWait()).toBe('talk');
    expect(tutorial.target()).toBe('chat');
    expect(tutorial.maskLifted()).toBe(false);
    tutorial.skipLook();
  });

  it('Should skip the campaign onto the five-player hand', () => {
    const tutorial = new TutorialService();
    tutorial.startLook({ name: 'You', avatar: 0 });
    const talkIndex = LOOK_BEATS.findIndex((beat) => beat.wait === 'talk');
    for (let index = 0; index < talkIndex; index++) tutorial.advanceLook();
    expect(tutorial.lookWait()).toBe('talk');
    expect(tutorial.skipLookBeat()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBe('1');
    tutorial.startFive({ name: 'You', avatar: 0 });
    expect(tutorial.playing()).toBe(true);
    tutorial.skipFive();
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

    await waitForLookWait(tutorial, 'say');
    expect(tutorial.talk().map((line) => line.key)).toEqual(
      LOOK_CAMPAIGN.map((line) => line.key),
    );

    expect(tutorial.lookComposeHintKey()).toBe('onboard.idea.composeHint');
    tutorial.say('count me in');
    expect(tutorial.maskLifted()).toBe(true);
    await waitForLookWait(tutorial, 'continue');
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
    await waitForLookWait(tutorial, 'say');

    tutorial.say('whatever I want');
    expect(tutorial.maskLifted()).toBe(true);
    await waitForLookWait(tutorial, 'continue');
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

  it('Should skip a five-player table onto the coming-soon card', () => {
    const tutorial = new TutorialService();
    tutorial.startPlay({ name: 'You', avatar: 0 }, 5);
    expect(tutorial.skipFiveSoon()).toBe(true);
    expect(tutorial.playing()).toBe(true);
    expect(tutorial.playSoon()).toBe(true);
    expect(tutorial.headlineKey()).toBe('onboard.comingSoon');
    tutorial.skipFive();
  });
});
