import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { Show } from 'solid-js';
import { Phase, type RoomSummary } from '@secret-hitler/shared';
import { HomeScreen } from './HomeScreen';
import { RoomsScreen } from '../RoomsScreen/RoomsScreen';
import { RulesScreen } from '../RulesScreen/RulesScreen';
import { SettingsScreen } from '../SettingsScreen/SettingsScreen';
import { WaitingRoomScreen } from '../WaitingRoomScreen/WaitingRoomScreen';
import { en } from '../../i18n/locales/en';
import { buildHarness, makeView, renderWithApp } from '../../../test/test-utils';

function publicLobby(overrides: Partial<RoomSummary> = {}): RoomSummary {
  return {
    id: 'public',
    code: 'PUB001',
    name: 'میز عمومی',
    playerCount: 2,
    maxPlayers: 6,
    hasPassword: false,
    phase: Phase.Lobby,
    kind: 'public',
    ...overrides,
  };
}

describe('HomeScreen', () => {
  it('Should send the player to Join when the public table is missing', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: en.home.findGame }));
    await waitFor(() => expect(harness.services.nav.screen()).toBe('join-game'));
    expect(screen.getByRole('tab', { name: 'Join Room' })).toBeTruthy();
  });

  it('Should sit Find Match at the public table', async () => {
    const harness = buildHarness();
    harness.services.settings.set('profileName', 'Ana');
    harness.services.game.listRooms = async () => [publicLobby()];
    const joined: string[] = [];
    harness.services.game.joinRoom = async (id) => {
      joined.push(id);
      return { roomId: id, code: 'PUB001', token: 'token-p', playerId: 'you' };
    };
    renderWithApp(() => <HomeScreen />, harness);

    await waitFor(() => expect(screen.getByText('2/6')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: en.home.findGame }));
    await waitFor(() => expect(harness.services.nav.screen()).toBe('waiting-room'));
    expect(joined).toEqual(['public']);
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

  it('Should keep the home poster to Find Match, play with friends, support, rules, and settings', () => {
    const harness = buildHarness();
    renderWithApp(() => <HomeScreen />, harness);

    expect(screen.getByRole('button', { name: en.home.findGame })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.home.playWithFriends })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.support.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.nav.rules })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(screen.getByText('0/6')).toBeTruthy();
  });

  it('Should open Support from the cycling text chip', () => {
    const harness = buildHarness();
    renderWithApp(
      () => (
        <Show
          when={harness.services.nav.screen() === 'home'}
          fallback={<div data-testid="support-open" />}
        >
          <HomeScreen />
        </Show>
      ),
      harness,
    );

    fireEvent.click(screen.getByRole('button', { name: en.support.title }));
    expect(harness.services.nav.screen()).toBe('support');
  });

  it('Should open create/join from Play with friends', () => {
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

    fireEvent.click(screen.getByRole('button', { name: en.home.playWithFriends }));
    expect(harness.services.nav.screen()).toBe('play');
    expect(screen.getByRole('tab', { name: 'Create Room' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: en.rooms.joinTab })).toBeTruthy();
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
    expect(screen.getByRole('button', { name: en.home.findGame })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.home.rejoin }));
    expect(harness.services.nav.screen()).toBe('waiting-room');
  });

  it('Should keep Play with friends on create/join even when a live seat is open', () => {
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

    fireEvent.click(screen.getByRole('button', { name: en.home.playWithFriends }));
    expect(harness.services.nav.screen()).toBe('play');
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
    expect(screen.getByRole('button', { name: en.home.findGame })).toBeTruthy();
  });
});
