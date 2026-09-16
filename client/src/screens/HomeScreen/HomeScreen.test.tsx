import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { Show } from 'solid-js';
import { Phase } from '@secret-hitler/shared';
import heroImage from '../../assets/home/hero.webp';
import heroFindingImage from '../../assets/home/hero-finding.webp';
import { HomeScreen } from './HomeScreen';
import { RoomsScreen } from '../RoomsScreen/RoomsScreen';
import { RulesScreen } from '../RulesScreen/RulesScreen';
import { SettingsScreen } from '../SettingsScreen/SettingsScreen';
import { WaitingRoomScreen } from '../WaitingRoomScreen/WaitingRoomScreen';
import { en } from '../../i18n/locales/en';
import { buildHarness, makeView, renderWithApp } from '../../../test/test-utils';

function findMatchButton() {
  return screen.getByRole('button', { name: new RegExp(en.home.findGame) });
}

function findingButton() {
  return screen.getByRole('button', { name: new RegExp(en.home.finding) });
}

describe('HomeScreen', () => {
  afterEach(() => {
    rs.restoreAllMocks();
  });

  it('Should stay on Home when Find Match cannot queue', async () => {
    const harness = buildHarness();
    const fetchSpy = rs.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
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

    fireEvent.click(findMatchButton());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(harness.services.nav.screen()).toBe('home');
    expect(findMatchButton()).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Join Room' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Create Room' })).toBeNull();
  });

  it('Should open create/join on the Join tab when Find Match is off', () => {
    const harness = buildHarness({ flags: { publicTable: false } });
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

    expect(screen.queryByRole('button', { name: new RegExp(en.home.findGame) })).toBeNull();
    expect(screen.queryByRole('button', { name: en.home.playWithFriends })).toBeNull();
    expect(screen.queryByText('0/6')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: en.home.play }));
    expect(harness.services.nav.screen()).toBe('join-game');
    expect(screen.getByRole('tab', { name: en.rooms.joinTab }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: en.rooms.createTab })).toBeTruthy();
  });

  it('Should queue Find Match as Guest when the profile has no name', async () => {
    const harness = buildHarness({ flags: { publicTable: true } });
    let queuedName = '';
    rs.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/match/queue')) {
        queuedName = JSON.parse(String(init?.body ?? '{}')).name;
        return new Response(
          JSON.stringify({ token: 'q-token', playerId: 'p1', waiting: 1, max: 6 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('[]', { status: 200 });
    });
    renderWithApp(() => <HomeScreen />, harness);

    fireEvent.click(findMatchButton());
    await waitFor(() => expect(harness.services.game.queued()).toBe(true));
    expect(queuedName).toBe(en.home.guest);
    expect(harness.services.nav.screen()).toBe('home');
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

    fireEvent.click(findMatchButton());
    await waitFor(() =>
      expect(findingButton()).toBeTruthy(),
    );
    expect(harness.services.nav.screen()).toBe('home');
    expect(harness.services.game.queued()).toBe(true);
    expect(screen.queryByRole('button', { name: en.home.inviteFriends })).toBeNull();
    expect(screen.getByText('1/6')).toBeTruthy();
    const findingPortrait = document.querySelector(`img[src="${heroFindingImage}"]`);
    expect(document.querySelector(`img[src="${heroImage}"]`)).toBeTruthy();
    expect(findingPortrait).toBeTruthy();
    expect(findingPortrait?.className).toContain('heroImageFinding');
    expect(findingPortrait?.parentElement?.className).toContain('heroFinding');
  });

  it('Should show how many people are waiting on Find Match', async () => {
    const harness = buildHarness({ flags: { publicTable: true } });
    harness.services.settings.set('profileName', 'Ana');
    rs.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/match/queue')) {
        return new Response(
          JSON.stringify({ token: 'q-token', playerId: 'p1', waiting: 4, max: 6 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/api/match')) {
        return new Response(JSON.stringify({ waiting: 3, max: 6 }), { status: 200 });
      }
      return new Response('[]', { status: 200 });
    });
    renderWithApp(() => <HomeScreen />, harness);

    await waitFor(() => expect(screen.getByText('3/6')).toBeTruthy());
    fireEvent.click(findMatchButton());
    await waitFor(() => expect(findingButton()).toBeTruthy());
    expect(screen.getByText('4/6')).toBeTruthy();
    harness.socket.emit({ type: 'match:status', waiting: 5, max: 6 });
    expect(screen.getByText('5/6')).toBeTruthy();
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

  it('Should keep the home poster to Find Match, invite friends, play with friends, support, rules, history, and settings', () => {
    const harness = buildHarness();
    renderWithApp(() => <HomeScreen />, harness);

    expect(findMatchButton()).toBeTruthy();
    expect(screen.getByRole('button', { name: en.home.inviteFriends })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.home.playWithFriends })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.support.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.nav.rules })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.home.history })).toBeTruthy();
    expect(screen.getByText(en.nav.rules)).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(7);
    expect(screen.getByText('0/6')).toBeTruthy();
    const findingPortrait = document.querySelector(`img[src="${heroFindingImage}"]`);
    expect(document.querySelector(`img[src="${heroImage}"]`)).toBeTruthy();
    expect(findingPortrait).toBeTruthy();
    expect(findingPortrait?.parentElement?.className).not.toContain('heroFinding');
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
          fallback={<RoomsScreen initialTab="join" />}
        >
          <HomeScreen />
        </Show>
      ),
      harness,
    );

    fireEvent.click(screen.getByRole('button', { name: en.home.playWithFriends }));
    expect(harness.services.nav.screen()).toBe('play');
    expect(screen.getByRole('tab', { name: en.rooms.joinTab }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: en.rooms.createTab })).toBeTruthy();
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
    expect(findMatchButton()).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.home.rejoin }));
    expect(harness.services.nav.screen()).toBe('waiting-room');
  });

  it('Should keep Play with friends on create/join even when a live seat is open', () => {
    const harness = buildHarness({ seated: true });
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
    harness.pushState(makeView());

    fireEvent.click(screen.getByRole('button', { name: en.home.playWithFriends }));
    expect(harness.services.nav.screen()).toBe('play');
    expect(screen.getByRole('tab', { name: en.rooms.joinTab }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: en.rooms.createTab })).toBeTruthy();
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
    expect(findMatchButton()).toBeTruthy();
  });

  it('Should list friends above Find Match and invite one with a tap', async () => {
    const harness = buildHarness();
    harness.services.settings.set('profileName', 'Ana');
    rs.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/social/list')) {
        return new Response(
          JSON.stringify({
            friends: [{ accountId: 'client:ben', name: 'Ben', avatar: 1 }],
            incomingRequests: [],
            outgoingRequests: [],
            incomingInvites: [],
            outgoingInvites: [],
            blocked: [],
            mates: {},
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/api/social/invites')) {
        return new Response(
          JSON.stringify({
            invite: {
              id: 'inv-1',
              from: { accountId: 'client:ana', name: 'Ana', avatar: 0 },
              to: { accountId: 'client:ben', name: 'Ben', avatar: 1 },
              noteId: 'emptySeat',
              roomCode: 'ABC123',
              createdAt: 1,
            },
            seat: {
              roomId: 'room-9',
              code: 'ABC123',
              shareLink: 'http://localhost/join/ABC123',
              token: 't-9',
              playerId: 'p-ana',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('[]', { status: 200 });
    });
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

    fireEvent.click(screen.getByRole('button', { name: en.home.inviteFriends }));
    await waitFor(() => expect(screen.getByText('Ben')).toBeTruthy());
    expect(screen.getByText(en.social.notes.emptySeat)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Ben/ }));
    await waitFor(() => expect(harness.services.nav.screen()).toBe('waiting-room'));
  });

  it('Should open history under the guide and send a friend request from a past table', async () => {
    const harness = buildHarness();
    harness.services.settings.set('profileName', 'Ana');
    let asked = false;
    rs.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/history/mine')) {
        return new Response(
          JSON.stringify([
            {
              id: 'game-1',
              winner: 'liberal',
              playerCount: 3,
              endedAt: '2026-01-01T00:00:00.000Z',
              youWon: true,
              players: [
                {
                  name: 'Ana',
                  role: 'liberal',
                  seat: 0,
                  won: true,
                  you: true,
                  accountId: null,
                },
                {
                  name: 'Ben',
                  role: 'fascist',
                  seat: 1,
                  won: false,
                  you: false,
                  accountId: 'client:ben',
                },
              ],
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/api/social/friends')) {
        asked = true;
        return new Response(
          JSON.stringify({
            id: 'req-1',
            from: { accountId: 'client:ana', name: 'Ana', avatar: 0 },
            to: { accountId: 'client:ben', name: 'Ben', avatar: 0 },
            createdAt: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.includes('/api/social/list')) {
        return new Response(
          JSON.stringify({
            friends: [],
            incomingRequests: [],
            outgoingRequests: asked
              ? [
                  {
                    id: 'req-1',
                    from: { accountId: 'client:ana', name: 'Ana', avatar: 0 },
                    to: { accountId: 'client:ben', name: 'Ben', avatar: 0 },
                    createdAt: 1,
                  },
                ]
              : [],
            incomingInvites: [],
            outgoingInvites: [],
            blocked: [],
            mates: {},
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('[]', { status: 200 });
    });
    renderWithApp(() => <HomeScreen />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.home.history }));
    await waitFor(() => expect(screen.getByText('Ben')).toBeTruthy());
    expect(screen.getByText(en.game.over.liberalsWin)).toBeTruthy();
    expect(screen.getByText(new RegExp(en.home.historyWon))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.game.over.addFriend }));
    await waitFor(() => expect(screen.getByText(en.game.over.sent)).toBeTruthy());
    expect(harness.services.nav.screen()).toBe('home');
  });
});
