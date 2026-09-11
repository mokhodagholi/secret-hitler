import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { Show } from 'solid-js';
import { HomeScreen } from './HomeScreen';
import { RoomsScreen } from '../RoomsScreen/RoomsScreen';
import { RulesScreen } from '../RulesScreen/RulesScreen';
import { SettingsScreen } from '../SettingsScreen/SettingsScreen';
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

  it('Should hide the title and keep currency off the home screen', () => {
    const harness = buildHarness();
    renderWithApp(() => <HomeScreen />, harness);

    expect(screen.queryByRole('heading', { name: 'Secret Hitler' })).toBeNull();
    expect(screen.queryByText('3.3K')).toBeNull();
    expect(screen.queryByText('Guest')).toBeNull();
    expect(screen.queryByText('How to Play')).toBeNull();
  });

  it('Should open Settings from the gear', () => {
    const harness = buildHarness();
    renderWithApp(
      () => (
        <Show
          when={harness.services.nav.screen() === 'home'}
          fallback={<SettingsScreen />}
        >
          <HomeScreen />
        </Show>
      ),
      harness,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(harness.services.nav.screen()).toBe('settings');
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
  });

  it('Should open Rules from the brass pair', () => {
    const harness = buildHarness();
    renderWithApp(
      () => (
        <Show
          when={harness.services.nav.screen() === 'home'}
          fallback={<RulesScreen />}
        >
          <HomeScreen />
        </Show>
      ),
      harness,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rules' }));
    expect(harness.services.nav.screen()).toBe('rules');
    expect(screen.getByRole('heading', { name: 'Rules' })).toBeTruthy();
  });

  it('Should keep the home poster to Find Game, rules, and settings', () => {
    const harness = buildHarness();
    renderWithApp(() => <HomeScreen />, harness);

    expect(screen.getByRole('button', { name: 'Find Game' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rules' })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
});
