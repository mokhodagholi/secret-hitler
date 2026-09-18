import { Show } from 'solid-js';
import { describe, expect, it, rs } from '@rstest/core';
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

function sendLookLine(text: string, fieldName: string): void {
  fireEvent.input(screen.getByRole('textbox', { name: fieldName }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: en.game.send }));
}

async function passLookChatLesson(): Promise<void> {
    clickContinue();
    clickContinue();
    clickContinue();
    clickContinue();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.talk)).toBeTruthy();
  clickContinue();
  expect(screen.getByText(en.onboard.idea.settings)).toBeTruthy();
  expect(screen.queryByRole('button', { name: en.onboard.continue })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: en.settings.title }));
  expect(screen.getByText(en.onboard.idea.settingsMenu)).toBeTruthy();
  expect(screen.getByRole('dialog', { name: en.settings.title })).toBeTruthy();
  clickContinue();
  expect(screen.getByText(en.onboard.idea.messages)).toBeTruthy();
  clickContinue();
  expect(screen.getByText(en.onboard.idea.writeHere)).toBeTruthy();
  expect(screen.queryByRole('button', { name: en.onboard.continue })).toBeNull();
  sendLookLine('hello there', en.onboard.idea.writeSomething);
  await waitFor(() => {
    expect(screen.getAllByText('hello there').length).toBeGreaterThan(0);
  });
  await waitFor(() => {
    expect(screen.getByText(en.onboard.idea.campaign)).toBeTruthy();
  });
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

  it('Should speak each look line once, even when the next beat repeats it', () => {
    const harness = buildHarness();
    const speak = rs.spyOn(harness.services.ravi, 'speakGuide');
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    while (harness.services.tutorial.looking()) {
      if (harness.services.tutorial.advanceLook()) break;
    }

    const times = (key: string) =>
      speak.mock.calls.filter((call) => call[0] === key).length;
    expect(times('onboard.idea.welcome')).toBe(1);
    expect(times('onboard.idea.people')).toBe(1);
    expect(times('onboard.idea.talkAbout')).toBe(1);
    expect(times('onboard.idea.yourTurn')).toBe(1);
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
    expect(screen.getByText(en.onboard.idea.thisPresidentLaws)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.talk)).toBeTruthy();
    expect(screen.getByLabelText(en.game.chat)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.game.muteSelf })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.settings.title })).toBeTruthy();
    expect(document.querySelector('[data-look-chrome-spacer]')).toBeTruthy();
  });

  it('Should open the table settings from the gear, then go on to the feed', () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    clickContinue();
    clickContinue();
    clickContinue();
    clickContinue();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.talk)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.settings)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.continue })).toBeNull();
    expect(screen.queryByRole('dialog', { name: en.settings.title })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: en.settings.title }));
    expect(screen.getByText(en.onboard.idea.settingsMenu)).toBeTruthy();
    expect(screen.getByRole('dialog', { name: en.settings.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.gameMenu.music })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.game.yourRole })).toBeTruthy();

    clickContinue();
    expect(screen.getByText(en.onboard.idea.messages)).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: en.settings.title })).toBeNull();
  });

  it('Should campaign in chat then wait for the viewer to write', async () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    await passLookChatLesson();
    expect(screen.getByText(en.onboard.idea.campaign)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.talkAbout)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.continue })).toBeNull();

    await waitFor(() => {
      expect(screen.getByText(en.onboard.idea.yourTurn)).toBeTruthy();
    });
    expect(screen.getAllByText(en.onboard.talk.listening).length).toBeGreaterThan(0);
    expect(screen.getAllByText(en.onboard.talk.putMeIn).length).toBeGreaterThan(1);
    expect(screen.getAllByText(en.onboard.talk.playingYou).length).toBeGreaterThan(0);
    expect(screen.getAllByText(en.onboard.talk.illPick).length).toBeGreaterThan(1);
    expect(screen.getByText(en.onboard.idea.composeHint)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.continue })).toBeNull();

    sendLookLine('count me in', en.onboard.idea.composeHint);

    await waitFor(() => {
      expect(screen.getAllByText('count me in').length).toBeGreaterThan(0);
    });
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

  it('Should skip the look table onto the five-player hand', async () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.onboard.skip }));
    expect(harness.services.nav.screen()).toBe('game');
    expect(harness.services.tutorial.looking()).toBe(false);
    expect(harness.services.tutorial.playing()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBe('1');
    expect(harness.services.tutorial.lock()).toBe('night');
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: en.ravi.deal.start })).toBeTruthy();
    });
  });

  it('Should open the five-player table after the last Continue', async () => {
    const harness = buildHarness();
    openLook(harness);
    renderWithApp(() => <LookRoutes />, harness);

    await passLookChatLesson();
    clickContinue();
    await waitFor(() => {
      expect(screen.getByText(en.onboard.idea.yourTurn)).toBeTruthy();
    });
    sendLookLine('count me in', en.onboard.idea.composeHint);
    await waitFor(() => {
      expect(screen.getByText(en.onboard.idea.youChancellor)).toBeTruthy();
    });
    clickContinue();
    expect(screen.getByText(en.onboard.idea.chancellorDoes)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.onlyPresidentSees)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.presidentBurns)).toBeTruthy();
    clickContinue();
    expect(screen.getByText(en.onboard.idea.youPickLaw)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.continue })).toBeNull();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: en.game.liberal })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: en.game.liberal }));
    expect(screen.getByText(en.onboard.idea.seeNext)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.onboard.seeNext }));

    expect(harness.services.nav.screen()).toBe('game');
    expect(harness.services.tutorial.looking()).toBe(false);
    expect(harness.services.tutorial.playing()).toBe(true);
    expect(localStorage.getItem(ONBOARDING_STEP_KEY)).toBe('1');
    expect(harness.services.tutorial.lock()).toBe('night');
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: en.ravi.deal.start })).toBeTruthy();
    });
  });
});
