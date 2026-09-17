import { Show } from 'solid-js';
import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { GameScreen } from './GameScreen';
import { en } from '../../i18n/locales/en';
import { ONBOARDING_STEP_KEY } from '../../tutorial/TutorialService';
import { useApp } from '../../services/AppContext';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

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

function clickContinue(): void {
  fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
}

describe('GameScreen — look', () => {
  it('Should paint the frozen table without a live session', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    expect(screen.getByText(en.onboard.idea.welcome)).toBeTruthy();
    expect(screen.getByText(en.game.president)).toBeTruthy();
    expect(screen.getByText('Nima')).toBeTruthy();
    expect(screen.getByText('Sara')).toBeTruthy();
    expect(screen.getByText('Reza')).toBeTruthy();
    expect(screen.getByText('Omid')).toBeTruthy();
    expect(screen.getByRole('button', { name: en.onboard.continue })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.onboard.skip })).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.previous })).toBeNull();
    expect(
      screen.queryByRole('dialog', { name: en.game.chancellorRevealTitleYou }),
    ).toBeNull();
  });

  it('Should retreat one look beat when Previous is pressed', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    clickContinue();
    expect(screen.getByText(en.onboard.idea.people)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.onboard.previous })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.onboard.previous }));
    expect(screen.getByText(en.onboard.idea.welcome)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.previous })).toBeNull();
  });

  it('Should walk seats and boards before the table starts talking', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    expect(screen.getByText(en.onboard.idea.welcome)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.people)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.boards)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.thisPresident)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.talk)).toBeTruthy();
    expect(screen.getByLabelText(en.game.chat)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.game.muteSelf })).toBeNull();
  });

  it('Should campaign in chat then wait for the viewer to write', async () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    clickContinue();
    clickContinue();
    clickContinue();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.talk)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.campaign)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.talkAbout)).toBeTruthy();
    clickContinue();

    await waitFor(() => {
      expect(screen.getByText(en.onboard.idea.yourTurn)).toBeTruthy();
    });
    expect(screen.getAllByText(en.onboard.talk.putMeIn).length).toBeGreaterThan(1);
    expect(screen.getAllByText(en.onboard.talk.playingYou).length).toBeGreaterThan(0);
    expect(screen.getAllByText(en.onboard.talk.illPick).length).toBeGreaterThan(1);
    expect(screen.getByText(en.onboard.idea.composeHint)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.continue })).toBeNull();

    const field = screen.getByRole('textbox', { name: en.onboard.idea.composeHint });
    fireEvent.input(field, { target: { value: en.onboard.idea.composeHint } });
    fireEvent.click(screen.getByRole('button', { name: en.game.send }));

    await waitFor(() => {
      expect(screen.getByText(en.onboard.idea.badPitch)).toBeTruthy();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('textbox', { name: en.onboard.idea.composeHint2 }),
      ).toBeTruthy();
    });
    fireEvent.input(screen.getByRole('textbox', { name: en.onboard.idea.composeHint2 }), {
      target: { value: en.onboard.idea.composeHint2 },
    });
    fireEvent.click(screen.getByRole('button', { name: en.game.send }));

    await waitFor(() => {
      expect(
        screen.getAllByText(en.onboard.talk.iPickYou.replace('{name}', 'You')).length,
      ).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(screen.getByText(en.onboard.idea.youChancellor)).toBeTruthy();
    });
    expect(
      screen.getByRole('dialog', { name: en.game.chancellorRevealTitleYou }),
    ).toBeTruthy();
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

  it('Should open the five-player table after the last Continue', async () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    clickContinue();
    clickContinue();
    clickContinue();
    clickContinue();
    clickContinue();
    clickContinue();
    clickContinue();
    await waitFor(() => {
      expect(screen.getByText(en.onboard.idea.yourTurn)).toBeTruthy();
    });
    fireEvent.input(screen.getByRole('textbox', { name: en.onboard.idea.composeHint }), {
      target: { value: en.onboard.idea.composeHint },
    });
    fireEvent.click(screen.getByRole('button', { name: en.game.send }));
    await waitFor(() => {
      expect(
        screen.getByRole('textbox', { name: en.onboard.idea.composeHint2 }),
      ).toBeTruthy();
    });
    fireEvent.input(screen.getByRole('textbox', { name: en.onboard.idea.composeHint2 }), {
      target: { value: en.onboard.idea.composeHint2 },
    });
    fireEvent.click(screen.getByRole('button', { name: en.game.send }));
    await waitFor(() => {
      expect(screen.getByText(en.onboard.idea.youChancellor)).toBeTruthy();
    });
    clickContinue();
    expect(screen.getByText(en.onboard.idea.seeNext)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.onboard.seeNext }));

    expect(harness.services.nav.screen()).toBe('game');
    expect(harness.services.tutorial.looking()).toBe(false);
    expect(harness.services.tutorial.playing()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBe('1');
    expect(screen.getByText(en.onboard.nightDone)).toBeTruthy();
  });
});
