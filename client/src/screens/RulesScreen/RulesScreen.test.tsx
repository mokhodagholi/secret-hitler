import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { Match, Switch } from 'solid-js';
import { RulesScreen } from './RulesScreen';
import { RulesLessonScreen } from './RulesLessonScreen';
import { topicFromScreen } from './topics';
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
      <Match when={topicFromScreen(nav.screen())}>
        {(topicId) => <RulesLessonScreen topicId={topicId()} />}
      </Match>
    </Switch>
  );
}

describe('RulesScreen', () => {
  it('Should name the game راز هیتلر and use question-style section titles in Persian', () => {
    const harness = buildHarness();
    harness.services.settings.set('language', 'fa');
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    expect(screen.getByRole('button', { name: fa.rules.overview })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.rules.setup })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.rules.roundTitle })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.rules.failTitle })).toBeTruthy();
    expect(screen.getByRole('button', { name: fa.rules.winningTitle })).toBeTruthy();
    expect(screen.queryByText(/راز هیتلر یه بازی نقش/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: fa.rules.overview }));
    expect(harness.services.nav.screen()).toBe('rules-overview');
    expect(screen.getByRole('heading', { name: fa.rules.overview })).toBeTruthy();
    expect(screen.getByText(/راز هیتلر یه بازی نقش/)).toBeTruthy();
  });

  it('Should keep the hub to topic cards until one is opened', () => {
    const harness = buildHarness();
    renderWithApp(() => <RulesScreen />, harness);

    expect(screen.getByText(en.rules.pick)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.rules.overview })).toBeTruthy();
    expect(screen.queryByText(en.rules.overviewBody)).toBeNull();
    expect(screen.queryByText(en.rules.setupBody)).toBeNull();
    expect(screen.queryByText(en.rules.failBody)).toBeNull();
  });

  it('Should open a lesson as its own screen', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.rules.failTitle }));
    expect(harness.services.nav.screen()).toBe('rules-fail');
    expect(screen.getByRole('heading', { name: en.rules.failTitle })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: en.rules.title })).toBeNull();
    expect(screen.getByText(en.rules.failBody)).toBeTruthy();
    expect(screen.queryByText(en.rules.overviewBody)).toBeNull();
    expect(screen.queryByRole('button', { name: en.rules.setup })).toBeNull();
  });

  it('Should return to the topic cards from a lesson without leaving rules', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.rules.overview }));
    expect(screen.getByText(en.rules.overviewBody)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.common.goBack }));
    expect(harness.services.nav.screen()).toBe('rules');
    expect(screen.getByRole('button', { name: en.rules.overview })).toBeTruthy();
    expect(screen.queryByText(en.rules.overviewBody)).toBeNull();
  });

  it('Should replace the lesson when walking to the next topic so back still hits the hub', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('rules');
    renderWithApp(() => <RulesRoutes />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.rules.overview }));
    fireEvent.click(screen.getByRole('button', { name: en.common.next }));
    expect(harness.services.nav.screen()).toBe('rules-setup');
    expect(screen.getByText(en.rules.setupBody)).toBeTruthy();
    expect(screen.queryByText(en.rules.overviewBody)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: en.common.goBack }));
    expect(harness.services.nav.screen()).toBe('rules');
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

    fireEvent.click(screen.getByRole('button', { name: fa.rules.roundTitle }));
    expect(screen.getByText('۱')).toBeTruthy();
    expect(screen.getByText('۲')).toBeTruthy();
    expect(screen.getByText('۳')).toBeTruthy();
    expect(screen.getByText('۴')).toBeTruthy();
    expect(screen.queryByText('1')).toBeNull();
  });
});
