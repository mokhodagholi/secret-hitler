import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { Show } from 'solid-js';
import { Phase } from '@secret-hitler/shared';
import { HomeScreen } from './HomeScreen';
import { RoomsScreen } from '../RoomsScreen/RoomsScreen';
import { RulesScreen } from '../RulesScreen/RulesScreen';
import { SettingsScreen } from '../SettingsScreen/SettingsScreen';
import { WaitingRoomScreen } from '../WaitingRoomScreen/WaitingRoomScreen';
import { en } from '../../i18n/locales/en';
import { buildHarness, makeView, renderWithApp } from '../../../test/test-utils';

describe('HomeScreen', () => {
  it('Should send the player to Join when they press Find Game', () => {
    const harness = buildHarness();
    harness.services.game.listRooms = async () => [];
    renderWithApp(
      () => (
        <Show
          when={harness.services.nav.screen() === 'home'}
          fallback={<RoomsScreen initialTab="join" />}
        >
          <HomeScreen />
        </Show>
      ),
      harness,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Find Game' }));
    expect(harness.services.nav.screen()).toBe('join-game');
    expect(screen.getByRole('tab', { name: 'Join Room' })).toBeTruthy();
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

    fireEvent.click(screen.getByRole('button', { name: en.nav.rules }));
    expect(harness.services.nav.screen()).toBe('rules');
    expect(screen.getByRole('heading', { name: en.rules.title })).toBeTruthy();
  });

  it('Should keep the home poster to Find Game, rules, and settings', () => {
    const harness = buildHarness();
    renderWithApp(() => <HomeScreen />, harness);

    expect(screen.getByRole('button', { name: 'Find Game' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.nav.rules })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('Should offer a way back when a live seat is still open', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(
      () => (
        <Show
          when={harness.services.nav.screen() === 'home'}
          fallback={<WaitingRoomScreen />}
        >
          <HomeScreen />
        </Show>
      ),
      harness,
    );
    harness.pushState(makeView());

    expect(screen.getByRole('button', { name: en.home.rejoin })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Find Game' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.home.rejoin }));
    expect(harness.services.nav.screen()).toBe('waiting-room');
  });

  it('Should keep Find Game on create/join even when a live seat is open', () => {
    const harness = buildHarness({ seated: true });
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
    harness.pushState(makeView());

    fireEvent.click(screen.getByRole('button', { name: 'Find Game' }));
    expect(harness.services.nav.screen()).toBe('join-game');
    expect(screen.getByRole('tab', { name: 'Create Room' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: en.rooms.joinTab })).toBeTruthy();
  });

  it('Should send an in-game seat back to the table', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <HomeScreen />, harness);
    harness.pushState(makeView({ phase: Phase.Nomination }));

    fireEvent.click(screen.getByRole('button', { name: en.home.rejoin }));
    expect(harness.services.nav.screen()).toBe('game');
  });

  it('Should hide the return button until a snapshot arrives', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <HomeScreen />, harness);

    expect(screen.queryByRole('button', { name: en.home.rejoin })).toBeNull();
    expect(screen.getByRole('button', { name: 'Find Game' })).toBeTruthy();
  });
});
