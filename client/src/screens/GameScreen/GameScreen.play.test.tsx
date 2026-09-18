import { Show } from 'solid-js';
import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { GameScreen } from './GameScreen';
import { en } from '../../i18n/locales/en';
import { useApp } from '../../services/AppContext';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

function PlayRoutes() {
  const { nav } = useApp();
  return (
    <Show when={nav.screen() === 'game'}>
      <GameScreen />
    </Show>
  );
}

describe('GameScreen — five-player table', () => {
  it('Should make the President tap Choose Chancellor in chat before a seat', async () => {
    const harness = buildHarness();
    harness.services.tutorial.startFive({ name: 'You', avatar: 0 });
    harness.services.nav.navigate('game');
    renderWithApp(() => <PlayRoutes />, harness);

    harness.services.tutorial.finishNight();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: en.game.startNomination }),
      ).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText(en.onboard.openNominateTap)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: en.game.startNomination }));
    await waitFor(() => {
      expect(screen.getByText(en.onboard.pickNima)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nima' }));
    await waitFor(() => {
      expect(harness.services.tutorial.playView()?.board.chancellor).toBeTruthy();
    });
  });

  it('Should keep the vote open and tell them to tap Ja after Nein', async () => {
    const harness = buildHarness();
    harness.services.tutorial.startFive({ name: 'You', avatar: 0 });
    harness.services.nav.navigate('game');
    renderWithApp(() => <PlayRoutes />, harness);

    harness.services.tutorial.finishNight();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: en.game.startNomination }),
      ).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: en.game.startNomination }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Nima' })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Nima' }));

    await waitFor(() => {
      expect(harness.services.tutorial.lock()).toBe('voteJa');
      expect(screen.getByRole('button', { name: en.game.voteNein })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: en.game.voteNein }));
    await waitFor(() => {
      expect(screen.getByText(en.onboard.voteRetry)).toBeTruthy();
    });
    expect(harness.services.tutorial.playView()?.you.vote).toBeNull();
    expect(screen.getByRole('button', { name: en.game.voteJa })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.game.voteJa }));
    await waitFor(() => {
      expect(harness.services.tutorial.playView()?.you.vote).toBe('ja');
    });
    expect(screen.queryByRole('button', { name: en.game.voteJa })).toBeNull();
  });
});
