import { Show } from 'solid-js';
import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { GameScreen } from './GameScreen';
import { en } from '../../i18n/locales/en';
import { ONBOARDING_STEP_KEY } from '../../tutorial/TutorialService';
import { useApp } from '../../services/AppContext';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

const LOOK_HEADLINES = [
  en.onboard.idea.table,
  en.onboard.idea.boards,
  en.onboard.idea.vote,
  en.onboard.idea.government,
  en.onboard.idea.laws,
  en.onboard.letsSit,
];

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

describe('GameScreen — look', () => {
  it('Should paint the frozen table without a live session', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    expect(screen.getByText(en.onboard.idea.table)).toBeTruthy();
    expect(screen.getByText('Nima')).toBeTruthy();
    expect(screen.getByText('Sara')).toBeTruthy();
    expect(screen.getByText('Reza')).toBeTruthy();
    expect(screen.getByText('Omid')).toBeTruthy();
    expect(screen.getByRole('button', { name: en.onboard.continue })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.onboard.skip })).toBeTruthy();
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

  it('Should go home when Skip is pressed', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.onboard.skip }));
    expect(harness.services.nav.screen()).toBe('home');
    expect(harness.services.tutorial.looking()).toBe(false);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBeNull();
  });

  it('Should go home after the last Continue', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    for (let index = 0; index < LOOK_HEADLINES.length; index++) {
      fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    }
    expect(harness.services.nav.screen()).toBe('home');
    expect(harness.services.tutorial.looking()).toBe(false);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBe('1');
  });
});
