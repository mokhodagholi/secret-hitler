import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
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
  afterEach(() => {
    rs.restoreAllMocks();
  });

  it('Should send the player to Join when Find Match is off', async () => {
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

  it('Should keep Find Match on home while searching', async () => {
    const harness = buildHarness({ flags: { publicTable: true } });
    harness.services.settings.set('profileName', 'Ana');
    rs.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/match/queue')) {
        return new Response(
          JSON.stringify({ token: 'q-token', playerId: 'p1', waiting: 1, max: 6 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/api/match')) {
        return new Response(JSON.stringify({ waiting: 1, max: 6 }), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    });
    renderWithApp(() => <HomeScreen />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.home.findGame }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: en.home.finding })).toBeTruthy(),
    );
    expect(harness.services.nav.screen()).toBe('home');
    expect(harness.services.game.queued()).toBe(true);
    expect(screen.queryByText('1/6')).toBeNull();
    expect(screen.queryByText('0/6')).toBeNull();
  });

  it('Should ask everyone to Accept when a reserved table is full', () => {
    const harness = buildHarness({ seated: true, flags: { publicTable: true } });
    renderWithApp(() => <HomeScreen />, harness);
    harness.pushState(
      makeView({
        kind: 'public',
        startChoice: { startedAt: 1, endsAt: Date.now() + 15_000 },
      }),
    );

    expect(screen.getByText(en.waiting.startChoiceHoldout)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.waiting.wantStart }));
    expect(harness.socket.lastSent('player:wantStart')).toEqual({
      type: 'player:wantStart',
    });
    expect(harness.services.nav.screen()).toBe('home');
  });

  it('Should hide the title and keep currency off the home screen', () => {
    const harness = buildHarness();
    renderWithApp(() => <HomeScreen />, harness);

    expect(screen.queryByRole('heading', { name: 'Secret Hitler' })).toBeNull();
    expect(screen.queryByText('3.3K')).toBeNull();
    expect(screen.queryByText('Guest')).toBeNull();
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

  it('Should open the guide from the labeled chip under Settings', () => {
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
    expect(screen.getByText(en.nav.rules)).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(screen.queryByText('0/6')).toBeNull();
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
