import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { HomeScreen } from './HomeScreen';
import { RoomsScreen } from '../RoomsScreen/RoomsScreen';
import { Show } from 'solid-js';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('HomeScreen', () => {
  it('Should send the player to the play menu when they press Play', () => {
    const harness = buildHarness();
    renderWithApp(
      () => (
        <Show
          when={harness.services.nav.screen() === 'home'}
          fallback={<RoomsScreen initialTab="create" />}
        >
          <HomeScreen />
        </Show>
      ),
      harness,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Find Game' }));
    expect(harness.services.nav.screen()).toBe('play');
    expect(screen.getByRole('tab', { name: 'Create Room' })).toBeTruthy();
  });
});
