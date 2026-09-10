import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { Show } from 'solid-js';
import { PlayerCardsScreen } from './PlayerCardsScreen';
import { HomeScreen } from '../HomeScreen/HomeScreen';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

afterEach(() => {
  rs.restoreAllMocks();
});

function renderPicker(harness: ReturnType<typeof buildHarness>) {
  harness.services.nav.navigate('player-cards');
  renderWithApp(
    () => (
      <Show
        when={harness.services.nav.screen() === 'player-cards'}
        fallback={<HomeScreen />}
      >
        <PlayerCardsScreen />
      </Show>
    ),
    harness,
  );
}

describe('PlayerCardsScreen', () => {
  it('Should store the chosen portrait locally without saving until leave', () => {
    const harness = buildHarness();
    const save = rs
      .spyOn(harness.services.game, 'saveProfile')
      .mockResolvedValue(undefined);
    renderPicker(harness);

    fireEvent.click(screen.getByRole('listitem', { name: 'کارل' }));
    fireEvent.click(screen.getByRole('listitem', { name: 'لوته' }));
    expect(harness.services.settings.settings.avatar).toBe(2);
    expect(harness.services.nav.screen()).toBe('player-cards');
    expect(save).not.toHaveBeenCalled();
  });

  it('Should persist the last chosen portrait when leaving the picker', () => {
    const harness = buildHarness();
    const save = rs
      .spyOn(harness.services.game, 'saveProfile')
      .mockResolvedValue(undefined);
    renderPicker(harness);

    fireEvent.click(screen.getByRole('listitem', { name: 'کارل' }));
    fireEvent.click(screen.getByRole('listitem', { name: 'لوته' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(harness.services.nav.screen()).toBe('home');
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({
      avatar: 2,
      clientId: harness.services.settings.settings.profileId,
      initData: undefined,
    });
  });

  it('Should skip the profile request when leaving without a new card', () => {
    const harness = buildHarness();
    const save = rs
      .spyOn(harness.services.game, 'saveProfile')
      .mockResolvedValue(undefined);
    renderPicker(harness);

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(harness.services.nav.screen()).toBe('home');
    expect(save).not.toHaveBeenCalled();
  });
});
