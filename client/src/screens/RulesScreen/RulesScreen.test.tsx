import { afterEach, describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { Match, Switch } from 'solid-js';
import { RulesScreen } from './RulesScreen';
import { RulesLessonScreen } from './RulesLessonScreen';
import { VideoTutorialScreen } from './VideoTutorialScreen';
import { TextTutorialScreen } from './TextTutorialScreen';
import { topicFromScreen, APARAT_WATCH_URL } from './topics';
import { HomeScreen } from '../HomeScreen/HomeScreen';
import { useApp } from '../../services/AppContext';
import { en } from '../../i18n/locales/en';
import { fa } from '../../i18n/locales/fa';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

function RulesRoutes() {
  const { nav } = useApp();
  return (
    <Switch fallback={<HomeScreen />}>
      <Match when={nav.screen() === 'rules'}>
        <RulesScreen />
      </Match>
      <Match when={nav.screen() === 'rules-video'}>
        <VideoTutorialScreen />
      </Match>
      <Match when={nav.screen() === 'rules-text'}>
        <TextTutorialScreen />
      </Match>
      <Match when={topicFromScreen(nav.screen())}>
        {(topicId) => <RulesLessonScreen topicId={topicId()} />}
      </Match>
    </Switch>
  );
}

function openWrittenGuide(name: string = en.tutorial.text) {
  fireEvent.click(screen.getByRole('button', { name }));
}

describe('RulesScreen', () => {
  it('Should put only the video and written tutorials on the hub', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    const titles = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
      .filter((label): label is string => label != null && label !== en.common.goBack);
    expect(titles).toEqual([en.tutorial.video, en.tutorial.text]);
  });

  it('Should open Aparat from the video card instead of embedding it', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.tutorial.video }));
    expect(harness.services.nav.screen()).toBe('rules-video');
    expect(screen.getByRole('heading', { name: en.tutorial.video })).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('button', { name: en.tutorial.videoOpen })).toBeTruthy();
  });

  it('Should open Aparat from the labeled button', () => {
    const opened: string[] = [];
    const originalOpen = window.open;
    window.open = ((url?: string | URL) => {
      opened.push(String(url));
      return null;
    }) as typeof window.open;

    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);
    fireEvent.click(screen.getByRole('button', { name: en.tutorial.video }));
    fireEvent.click(screen.getByRole('button', { name: en.tutorial.videoOpen }));
    expect(opened).toEqual([APARAT_WATCH_URL]);
    window.open = originalOpen;
  });

  it('Should enter the written topic cards from the text tutorial card', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    openWrittenGuide();
    expect(harness.services.nav.screen()).toBe('rules-text');
    expect(screen.getByRole('button', { name: en.rules.overview })).toBeTruthy();
    expect(screen.queryByText(en.rules.whatIsThis.lead)).toBeNull();
  });

  it('Should show the announce banner on a first-run visit to the hub', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    harness.services.tutorial.beginAnnouncement();
    renderWithApp(() => <RulesScreen />, harness);

    expect(screen.getByText(en.tutorial.announce)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.tutorial.continue }));
    expect(screen.queryByText(en.tutorial.announce)).toBeNull();
    expect(harness.services.tutorial.announcing()).toBe(false);
  });

  it('Should name the game راز هیتلر and use question-style section titles in Persian', () => {
    const harness = buildHarness();
    harness.services.settings.set('language', 'fa');
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    expect(screen.getByRole('button', { name: fa.tutorial.video })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.tutorial.text })).toBeTruthy();
    expect(screen.queryByRole('button', { name: fa.rules.overview })).toBeNull();

    openWrittenGuide(fa.tutorial.text);
    expect(screen.getByRole('button', { name: fa.rules.overview })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.rules.kit.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.rules.laws.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.rules.setup })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.rules.roundTitle })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.rules.failTitle })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.rules.winningTitle })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.rules.online.title })).toBeTruthy();
    expect(screen.queryByText(fa.rules.whatIsThis.lead)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: fa.rules.overview }));
    expect(harness.services.nav.screen()).toBe('rules-what-is-this');
    expect(screen.getByRole('heading', { name: fa.rules.overview })).toBeTruthy();
    expect(screen.getByText(fa.rules.whatIsThis.lead)).toBeTruthy();
    expect(screen.getByText(fa.rules.whatIsThis.liberalTeam)).toBeTruthy();
    expect(screen.queryByText(fa.rules.kit.policy.title)).toBeNull();
  });

  it('Should show the real table pieces on the kit lesson', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    openWrittenGuide();
    fireEvent.click(screen.getByRole('button', { name: en.rules.kit.title }));
    expect(harness.services.nav.screen()).toBe('rules-contents');
    expect(screen.getByRole('heading', { name: en.rules.kit.title })).toBeTruthy();
    expect(screen.getByText(en.rules.kit.vote.body)).toBeTruthy();
    expect(screen.getByText(en.rules.kit.boards.body)).toBeTruthy();
    expect(screen.getByText(en.game.president)).toBeTruthy();
    expect(screen.getByText(en.game.chancellor)).toBeTruthy();
    expect(screen.queryByText(en.rules.whatIsThis.lead)).toBeNull();
    expect(screen.queryByText('Components')).toBeNull();
  });

  it('Should teach how laws are drawn, burned, and reshuffled', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    openWrittenGuide();
    fireEvent.click(screen.getByRole('button', { name: en.rules.laws.title }));
    expect(harness.services.nav.screen()).toBe('rules-laws');
    expect(screen.getByText(en.rules.laws.what)).toBeTruthy();
    expect(screen.getByText(en.rules.laws.draw)).toBeTruthy();
    expect(screen.getByText(en.rules.laws.empty)).toBeTruthy();
    expect(screen.getByText(en.rules.laws.win)).toBeTruthy();
  });

  it('Should keep the hub to the two tutorial cards until one is opened', () => {
    const harness = buildHarness();
    renderWithApp(() => <RulesScreen />, harness);

    expect(screen.getByRole('button', { name: en.tutorial.video })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.tutorial.text })).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.rules.overview })).toBeNull();
    expect(screen.queryByText(en.rules.whatIsThis.lead)).toBeNull();
    expect(screen.queryByText(en.rules.setupBody)).toBeNull();
    expect(screen.queryByText(en.rules.failBody)).toBeNull();
  });

  it('Should open a lesson as its own screen', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    openWrittenGuide();
    fireEvent.click(screen.getByRole('button', { name: en.rules.failTitle }));
    expect(harness.services.nav.screen()).toBe('rules-failed-government');
    expect(screen.getByRole('heading', { name: en.rules.failTitle })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: en.rules.title })).toBeNull();
    expect(screen.getByText(en.rules.failBody)).toBeTruthy();
    expect(screen.queryByText(en.rules.whatIsThis.lead)).toBeNull();
    expect(screen.queryByRole('button', { name: en.rules.setup })).toBeNull();
  });

  it('Should return to the topic cards from a lesson without leaving rules', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    openWrittenGuide();
    fireEvent.click(screen.getByRole('button', { name: en.rules.overview }));
    expect(screen.getByText(en.rules.whatIsThis.lead)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.common.goBack }));
    expect(harness.services.nav.screen()).toBe('rules-text');
    expect(screen.getByRole('button', { name: en.rules.overview })).toBeTruthy();
    expect(screen.queryByText(en.rules.whatIsThis.lead)).toBeNull();
  });

  it('Should replace the lesson when walking to the next topic so back still hits the hub', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    openWrittenGuide();
    fireEvent.click(screen.getByRole('button', { name: en.rules.overview }));
    fireEvent.click(screen.getByRole('button', { name: en.common.next }));
    expect(harness.services.nav.screen()).toBe('rules-contents');
    expect(screen.getByText(en.rules.kit.policy.title)).toBeTruthy();
    expect(screen.queryByText(en.rules.whatIsThis.lead)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: en.common.goBack }));
    expect(harness.services.nav.screen()).toBe('rules-text');
  });

  it('Should leave rules from the hub back control', () => {
    const harness = buildHarness();
    renderWithApp(() => <RulesRoutes />, harness);

    harness.services.nav.navigate('rules');
    fireEvent.click(screen.getByRole('button', { name: en.common.goBack }));
    expect(harness.services.nav.screen()).toBe('home');
  });

  it('Should show Persian numerals on each-round steps', () => {
    const harness = buildHarness();
    harness.services.settings.set('language', 'fa');
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    openWrittenGuide(fa.tutorial.text);
    fireEvent.click(screen.getByRole('button', { name: fa.rules.roundTitle }));
    expect(screen.getAllByText('۱').length).toBeGreaterThan(0);
    expect(screen.getAllByText('۲').length).toBeGreaterThan(0);
    expect(screen.getAllByText('۳').length).toBeGreaterThan(0);
    expect(screen.getAllByText('۴').length).toBeGreaterThan(0);
    expect(screen.queryByText('1')).toBeNull();
  });

  it('Should show a coloured mix for each table size on setup', () => {
    const harness = buildHarness();
    harness.services.settings.set('language', 'fa');
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    openWrittenGuide(fa.tutorial.text);
    fireEvent.click(screen.getByRole('button', { name: fa.rules.setup }));
    expect(screen.getByText(fa.rules.setupMix.players.replace('{count}', '۵'))).toBeTruthy();
    expect(screen.getAllByText(fa.rules.setupMix.nightSmall).length).toBe(2);
    expect(screen.getAllByText(fa.rules.setupMix.nightLarge).length).toBe(4);
  });

  it('Should show the election tracker on a failed government', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    openWrittenGuide();
    fireEvent.click(screen.getByRole('button', { name: en.rules.failTitle }));
    expect(screen.getByText(en.rules.failTracker.first)).toBeTruthy();
    expect(screen.getByText(en.rules.failTracker.chaos)).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText(en.rules.failBody)).toBeTruthy();
  });

  it('Should teach winning with table scenarios, not just the two clocks', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    openWrittenGuide();
    fireEvent.click(screen.getByRole('button', { name: en.rules.winningTitle }));
    expect(screen.getByText(/Those are the clocks/)).toBeTruthy();
    expect(screen.getByText(en.rules.winning.liberals)).toBeTruthy();
    expect(screen.getByText(en.rules.winning.hitlerChancellor.title)).toBeTruthy();
    expect(screen.getByText(en.rules.winning.execution.body)).toBeTruthy();
    expect(screen.getByText(en.rules.winning.trustedHitler.title)).toBeTruthy();
    expect(screen.getByText(en.rules.winning.chaos.title)).toBeTruthy();
    expect(screen.getByText(en.rules.rememberBody)).toBeTruthy();
  });

  it('Should list how the online table differs from the printed rulebook', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    openWrittenGuide();
    fireEvent.click(screen.getByRole('button', { name: en.rules.online.title }));
    expect(harness.services.nav.screen()).toBe('rules-online');
    expect(screen.getByRole('heading', { name: en.rules.online.title })).toBeTruthy();
    expect(screen.getByText(en.rules.online.lead)).toBeTruthy();
    expect(screen.getByText(en.rules.online.vote.title)).toBeTruthy();
    expect(screen.getByText(en.rules.online.vote.body)).toBeTruthy();
    expect(screen.getByText(en.rules.online.office.title)).toBeTruthy();
    expect(screen.getByText(en.rules.online.leave.title)).toBeTruthy();
    expect(screen.getByText(en.rules.online.clocks.title)).toBeTruthy();
    expect(screen.getByText(en.rules.online.clocks.body)).toBeTruthy();
    expect(screen.getByText(en.rules.online.clocks.vote)).toBeTruthy();
    expect(screen.getByText(en.rules.online.clocks.veto)).toBeTruthy();
    expect(screen.getByText(en.rules.online.clocks.law)).toBeTruthy();
    expect(screen.getByText(en.rules.online.clocks.why)).toBeTruthy();
  });
});
