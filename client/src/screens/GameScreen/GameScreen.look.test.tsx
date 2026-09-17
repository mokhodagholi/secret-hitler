import { Show } from 'solid-js';
import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { GameScreen } from './GameScreen';
import { en } from '../../i18n/locales/en';
import { LOOK_BEATS } from '../../tutorial/lookView';
import { ONBOARDING_STEP_KEY } from '../../tutorial/TutorialService';
import { useApp } from '../../services/AppContext';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

const LOOK_HEADLINES = LOOK_BEATS.map((beat) => {
  const [group, ...rest] = beat.headline.split('.');
  let cursor: unknown = en;
  for (const part of [group, ...rest]) {
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor as string;
});

function LookRoutes() {
  const { nav } = useApp();
  return (
    <Show when={nav.screen() === 'game'}>
      <GameScreen />
    </Show>
  );
}

function openLook(harness: ReturnType<typeof buildHarness>): void {
  harness.services.tutorial.startLook({ name: 'You', avatar: 0 });
  harness.services.nav.navigate('game');
}

function advanceTo(target: string): void {
  const index = LOOK_BEATS.findIndex((beat) => beat.target === target);
  for (let step = 0; step < index; step++) {
    fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
  }
}

describe('GameScreen — look', () => {
  it('Should paint the frozen table without a live session', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    expect(screen.getByText(en.onboard.idea.welcome)).toBeTruthy();
    expect(screen.getByText('Nima')).toBeTruthy();
    expect(screen.getByText('Sara')).toBeTruthy();
    expect(screen.getByText('Reza')).toBeTruthy();
    expect(screen.getByText('Omid')).toBeTruthy();
    expect(screen.getByRole('button', { name: en.onboard.continue })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.onboard.skip })).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.previous })).toBeNull();
  });

  it('Should retreat one look beat when Previous is pressed', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    expect(screen.getByText(LOOK_HEADLINES[1])).toBeTruthy();
    expect(screen.getByRole('button', { name: en.onboard.previous })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.onboard.previous }));
    expect(screen.getByText(LOOK_HEADLINES[0])).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.previous })).toBeNull();
  });

  it('Should advance the header through each look beat', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    expect(screen.getByText(LOOK_HEADLINES[0])).toBeTruthy();
    for (const headline of LOOK_HEADLINES.slice(1)) {
      fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
      expect(screen.getByText(headline)).toBeTruthy();
    }
  });

  it('Should show the government ticket on the government beat', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    advanceTo('government');

    expect(screen.getByText(en.onboard.idea.government)).toBeTruthy();
    expect(
      screen.getByRole('dialog', { name: en.game.chancellorRevealTitleYou }),
    ).toBeTruthy();
    expect(screen.getAllByText(en.game.president).length).toBeGreaterThan(0);
    expect(screen.getAllByText(en.game.chancellor).length).toBeGreaterThan(0);
  });

  it('Should show Ja / Nein vote cards on the vote beat', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    advanceTo('vote');

    expect(screen.getByText(en.onboard.idea.vote)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.game.voteJa })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.game.voteNein })).toBeTruthy();
  });

  it('Should go home when Skip is pressed', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.onboard.skip }));
    expect(harness.services.nav.screen()).toBe('home');
    expect(harness.services.tutorial.looking()).toBe(false);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBeNull();
  });

  it('Should open the five-player table after the last Continue', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    for (let index = 0; index < LOOK_HEADLINES.length; index++) {
      fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    }
    expect(harness.services.nav.screen()).toBe('game');
    expect(harness.services.tutorial.looking()).toBe(false);
    expect(harness.services.tutorial.playing()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBe('1');
    expect(screen.getByText(en.onboard.nightDone)).toBeTruthy();
  });
});
