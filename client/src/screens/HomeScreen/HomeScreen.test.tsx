import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { Show } from 'solid-js';
import { Phase } from '@secret-hitler/shared';
import heroImage from '../../assets/home/hero.webp';
import { HomeScreen } from './HomeScreen';
import { RoomsScreen } from '../RoomsScreen/RoomsScreen';
import { RulesScreen } from '../RulesScreen/RulesScreen';
import { SettingsScreen } from '../SettingsScreen/SettingsScreen';
import { WaitingRoomScreen } from '../WaitingRoomScreen/WaitingRoomScreen';
import { en } from '../../i18n/locales/en';
import { ONBOARDING_HOME_SETTINGS_KEY } from '../../tutorial/TutorialService';
import { buildHarness, makeView, renderWithApp } from '../../../test/test-utils';

describe('HomeScreen', () => {
  afterEach(() => {
    rs.restoreAllMocks();
  });

  it('Should open Join without Create tabs when the public table is on', () => {
    const harness = buildHarness({ flags: { publicTable: true } });
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
    fireEvent.click(screen.getByRole('button', { name: en.home.play }));
    expect(harness.services.nav.screen()).toBe('join-game');
    expect(screen.queryByRole('tab', { name: en.rooms.joinTab })).toBeNull();
    expect(screen.queryByRole('tab', { name: en.rooms.createTab })).toBeNull();
    expect(screen.getByRole('button', { name: en.rooms.ownTable })).toBeTruthy();
  });

  it('Should open create/join on the Join tab when the public table is off', () => {
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

  it('Should keep Play on Home even before flags are ready', () => {
    const harness = buildHarness({ flags: { publicTable: true }, flagsReady: false });
    renderWithApp(() => <HomeScreen />, harness);

    expect(screen.queryByRole('button', { name: new RegExp(en.home.findGame) })).toBeNull();
    expect(screen.getByRole('button', { name: en.home.play })).toBeTruthy();
  });

  it('Should hide the title and keep currency off the home screen', () => {
    const harness = buildHarness();
    renderWithApp(() => <HomeScreen />, harness);

    expect(screen.queryByRole('heading', { name: 'Secret Hitler' })).toBeNull();
    expect(screen.queryByText('3.3K')).toBeNull();
    expect(screen.queryByText('Guest')).toBeNull();
  });

  it('Should open the onboarding table from the home icon', () => {
    const harness = buildHarness();
    renderWithApp(
      () => (
        <Show
          when={harness.services.nav.screen() === 'home'}
          fallback={<div data-testid="onboarding-open" />}
        >
          <HomeScreen />
        </Show>
      ),
      harness,
    );

    const button = screen.queryByRole('button', { name: en.home.checkOnboarding });
    if (!import.meta.env.DEV) {
      expect(button).toBeNull();
      return;
    }
    expect(screen.getByText(en.home.checkOnboarding)).toBeTruthy();
    fireEvent.click(button!);
    expect(harness.services.nav.screen()).toBe('onboarding');
    expect(harness.services.tutorial.introducing()).toBe(true);
  });

  it('Should ring the home gear from the palette icon', () => {
    const harness = buildHarness();
    renderWithApp(() => <HomeScreen />, harness);

    const button = screen.queryByRole('button', {
      name: en.home.checkSettingsOnboarding,
    });
    if (!import.meta.env.DEV) {
      expect(button).toBeNull();
      return;
    }
    expect(screen.getByText(en.home.checkSettingsOnboarding)).toBeTruthy();
    fireEvent.click(button!);
    expect(harness.services.nav.screen()).toBe('home');
    expect(harness.services.tutorial.guidingHome()).toBe(true);
    expect(screen.getByText(en.onboard.idea.homeSettings)).toBeTruthy();
  });

  it('Should start the history tour from the home trophy', () => {
    const harness = buildHarness();
    renderWithApp(() => <HomeScreen />, harness);

    const button = screen.queryByRole('button', {
      name: en.home.checkHistoryOnboarding,
    });
    if (!import.meta.env.DEV) {
      expect(button).toBeNull();
      return;
    }
    expect(screen.getByText(en.home.checkHistoryOnboarding)).toBeTruthy();
    fireEvent.click(button!);
    expect(harness.services.nav.screen()).toBe('home');
    expect(harness.services.tutorial.reviewingHistory()).toBe(true);
    expect(screen.getByText(/the details are here/)).toBeTruthy();
    expect(screen.getByText(/Tap it/)).toBeTruthy();
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

    expect(screen.getByText(en.nav.settings)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(harness.services.nav.screen()).toBe('settings');
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
  });

  it('Should ring the home settings gear on a first visit', () => {
    const harness = buildHarness({ flags: { onboarding: true } });
    const speak = rs.spyOn(harness.services.ravi, 'speakGuide');
    harness.services.tutorial.offerAfterSplash(harness.services.nav, false, true);
    harness.services.tutorial.declineSit();
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

    expect(screen.getByText(en.onboard.idea.homeSettings)).toBeTruthy();
    expect(speak).toHaveBeenCalledWith('onboard.idea.homeSettings');
    expect(screen.getByRole('button', { name: en.onboard.skip })).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.continue })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(harness.services.nav.screen()).toBe('settings');
    expect(harness.services.tutorial.guidingHome()).toBe(true);
    expect(localStorage.getItem('sh:onboarding-home-settings')).toBeNull();
    expect(screen.getByText(en.onboard.settings.name)).toBeTruthy();
    expect(speak.mock.calls.filter((call) => call[0] === 'onboard.settings.name')).toHaveLength(1);
    expect(screen.getByRole('button', { name: en.onboard.continue })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Settings' })).toBeNull();
  });

  it('Should skip the home settings ring without opening Settings', () => {
    const harness = buildHarness({ flags: { onboarding: true } });
    harness.services.tutorial.offerAfterSplash(harness.services.nav, false, true);
    harness.services.tutorial.declineSit();
    renderWithApp(() => <HomeScreen />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.onboard.skip }));
    expect(harness.services.nav.screen()).toBe('home');
    expect(localStorage.getItem('sh:onboarding-home-settings')).toBe('1');
    expect(screen.queryByText(en.onboard.idea.homeSettings)).toBeNull();
    expect(screen.getByText(/the details are here/)).toBeTruthy();
    expect(screen.getByText(/Tap it/)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.home.play })).toBeTruthy();
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

  it('Should keep the home poster to Play, support, rules, history, and settings', () => {
    const harness = buildHarness({ flags: { publicTable: true } });
    renderWithApp(() => <HomeScreen />, harness);

    expect(screen.getByRole('button', { name: en.home.play })).toBeTruthy();
    expect(screen.queryByRole('button', { name: new RegExp(en.home.findGame) })).toBeNull();
    expect(screen.queryByRole('button', { name: en.home.inviteFriends })).toBeNull();
    expect(screen.queryByRole('button', { name: en.home.playWithFriends })).toBeNull();
    expect(screen.getByRole('button', { name: en.support.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.nav.rules })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.home.history })).toBeTruthy();
    expect(screen.getByText(en.nav.settings)).toBeTruthy();
    expect(screen.getByText(en.nav.rules)).toBeTruthy();
    expect(screen.queryByText('0/6')).toBeNull();
    expect(document.querySelector(`img[src="${heroImage}"]`)).toBeTruthy();
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

  it('Should offer a way back when a live seat is still open', () => {
    const harness = buildHarness({ seated: true, flags: { publicTable: true } });
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
    expect(screen.getByRole('button', { name: en.home.play })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.home.rejoin }));
    expect(harness.services.nav.screen()).toBe('waiting-room');
  });

  it('Should still open Join from Play when a live seat is open', () => {
    const harness = buildHarness({ seated: true, flags: { publicTable: true } });
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

    fireEvent.click(screen.getByRole('button', { name: en.home.play }));
    expect(harness.services.nav.screen()).toBe('join-game');
    expect(screen.queryByRole('tab', { name: en.rooms.createTab })).toBeNull();
    expect(screen.getByRole('button', { name: en.rooms.ownTable })).toBeTruthy();
  });

  it('Should send an in-game seat back to the table', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <HomeScreen />, harness);
    harness.pushState(makeView({ phase: Phase.Nomination }));

    fireEvent.click(screen.getByRole('button', { name: en.home.rejoin }));
    expect(harness.services.nav.screen()).toBe('game');
  });

  it('Should hide the return button until a snapshot arrives', () => {
    const harness = buildHarness({ seated: true, flags: { publicTable: true } });
    renderWithApp(() => <HomeScreen />, harness);

    expect(screen.queryByRole('button', { name: en.home.rejoin })).toBeNull();
    expect(screen.getByRole('button', { name: en.home.play })).toBeTruthy();
  });

  it('Should not invite friends from home', () => {
    const harness = buildHarness();
    renderWithApp(() => <HomeScreen />, harness);
    expect(screen.queryByRole('button', { name: en.home.inviteFriends })).toBeNull();
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
    await waitFor(() => expect(screen.getByText(en.game.over.liberalsWin)).toBeTruthy());
    expect(screen.queryByText('Ben')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(en.game.over.liberalsWin) }),
    );
    await waitFor(() => expect(screen.getByText('Ben')).toBeTruthy());
    expect(screen.getByText(en.game.over.liberalsWin)).toBeTruthy();
    expect(screen.getByText(new RegExp(en.home.historyWon))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.game.over.addFriend }));
    await waitFor(() => expect(screen.getByText(en.game.over.sent)).toBeTruthy());
    expect(harness.services.nav.screen()).toBe('home');
  });

  it('Should walk mock history and add Reza without hitting the server', () => {
    localStorage.setItem(ONBOARDING_HOME_SETTINGS_KEY, '1');
    const harness = buildHarness({ flags: { onboarding: true } });
    const fetchSpy = rs.spyOn(globalThis, 'fetch');
    renderWithApp(() => <HomeScreen />, harness);

    expect(screen.getByText(/the details are here/)).toBeTruthy();
    expect(screen.getByText(/Tap it/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.continue })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: en.home.history }));

    expect(screen.getByText(en.onboard.history.list)).toBeTruthy();
    expect(screen.getByText(en.game.over.liberalsWin)).toBeTruthy();
    expect(screen.getByText(new RegExp(en.home.historyWon))).toBeTruthy();
    expect(screen.queryByText('Nima')).toBeNull();
    expect(screen.queryByText(en.game.over.fascistsWin)).toBeNull();

    for (let step = 0; step < 3; step++) {
      fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    }
    expect(screen.getByText(en.onboard.history.people)).toBeTruthy();
    expect(screen.getByText('Nima')).toBeTruthy();
    expect(screen.getByText('Reza')).toBeTruthy();
    expect(screen.getAllByText(en.game.over.friends).length).toBeGreaterThan(0);
    expect(screen.getByText(en.game.over.sent)).toBeTruthy();
    expect(screen.getByText(en.social.incomingRequests)).toBeTruthy();

    for (let step = 0; step < 3; step++) {
      fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    }
    expect(screen.getByText(/You can make friends from here/)).toBeTruthy();
    expect(screen.getByText(/Tap Add/)).toBeTruthy();
    fireEvent.click(screen.getByText('Reza').parentElement!.querySelector('button')!);
    expect(screen.getByText(en.onboard.history.sent)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    expect(screen.getByText(en.onboard.history.ties)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    expect(screen.getByText(/You can close it from here/)).toBeTruthy();
    expect(screen.getByText(/Tap the X/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.common.goBack }));
    expect(screen.getByText(/Imagine you played another hand and lost/)).toBeTruthy();
    expect(screen.getByText(/Tap it/)).toBeTruthy();
    expect(screen.queryByText(en.game.over.fascistsWin)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: en.home.history }));
    expect(screen.getByText(en.onboard.history.lossCard)).toBeTruthy();
    expect(screen.getByText(en.game.over.fascistsWin)).toBeTruthy();
    expect(screen.getAllByText(new RegExp(en.home.historyLost)).length).toBeGreaterThan(0);
    expect(screen.getByText('Maryam')).toBeTruthy();
    expect(screen.queryByText('Hoda')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    expect(screen.getByText(en.onboard.history.done)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    expect(harness.services.tutorial.reviewingHistory()).toBe(false);
    expect(screen.queryByText(en.onboard.history.done)).toBeNull();
    expect(localStorage.getItem('sh:onboarding-home-history')).toBe('1');
  });
});
