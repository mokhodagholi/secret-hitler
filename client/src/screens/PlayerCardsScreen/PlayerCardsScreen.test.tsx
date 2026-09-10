import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { Show } from 'solid-js';
import { PlayerCardsScreen } from './PlayerCardsScreen';
import { HomeScreen } from '../HomeScreen/HomeScreen';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('PlayerCardsScreen', () => {
  it('Should store the chosen portrait and stay on the picker', () => {
    const harness = buildHarness();
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

    fireEvent.click(screen.getByRole('listitem', { name: 'کارل' }));
    expect(harness.services.settings.settings.avatar).toBe(1);
    expect(harness.services.nav.screen()).toBe('player-cards');
  });
});
