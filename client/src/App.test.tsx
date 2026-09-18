import { describe, expect, it } from '@rstest/core';
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { DEFAULT_FLAGS, Phase } from '@secret-hitler/shared';
import { App } from './App';
import { en } from './i18n/locales/en';
import { TUTORIAL_ANNOUNCE_LIMIT, ONBOARDING_DECLINE_KEY } from './tutorial/TutorialService';
import { buildHarness, makeView } from '../test/test-utils';

describe('App — first-run look', () => {
  it('Should offer Sit after splash on a first visit', async () => {
    const harness = buildHarness({ flags: { onboarding: true } });
    render(() => <App services={harness.services} />);

    await waitFor(() => expect(screen.getByText(en.onboard.piece.welcome)).toBeTruthy());
    expect(harness.services.nav.screen()).toBe('home');
    expect(screen.getByRole('button', { name: en.onboard.sit })).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.onboard.notNow })).toBeNull();
    expect(screen.queryByText(en.tutorial.announce)).toBeNull();
  });

  it('Should sit onto the intro pages', async () => {
    const harness = buildHarness({ flags: { onboarding: true } });
    render(() => <App services={harness.services} />);
    await waitFor(() => expect(screen.getByRole('button', { name: en.onboard.sit })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: en.onboard.sit }));
    expect(harness.services.nav.screen()).toBe('onboarding');
    expect(harness.services.tutorial.introducing()).toBe(true);
    expect(screen.getByText(en.onboard.piece.rolesTitle)).toBeTruthy();
    expect(screen.getByText(en.onboard.piece.roles)).toBeTruthy();
  });

  it('Should stay home after Not now once Sit was deferred before', async () => {
    localStorage.setItem(ONBOARDING_DECLINE_KEY, '1');
    const harness = buildHarness({ flags: { onboarding: true } });
    render(() => <App services={harness.services} />);
    await waitFor(() => expect(screen.getByRole('button', { name: en.onboard.notNow })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: en.onboard.notNow }));
    expect(localStorage.getItem(ONBOARDING_DECLINE_KEY)).toBe('2');
    expect(harness.services.nav.screen()).toBe('home');
    expect(screen.queryByText(en.onboard.piece.welcome)).toBeNull();
    expect(screen.getByText(en.onboard.idea.homeSettings)).toBeTruthy();
  });

  it('Should go home after splash once the sit offer has been seen three times', async () => {
    localStorage.setItem(ONBOARDING_DECLINE_KEY, String(TUTORIAL_ANNOUNCE_LIMIT));
    const harness = buildHarness({ flags: { onboarding: true } });
    render(() => <App services={harness.services} />);

    await waitFor(() => expect(screen.getByRole('button', { name: en.home.play })).toBeTruthy());
    expect(harness.services.nav.screen()).toBe('home');
    expect(screen.queryByText(en.onboard.piece.welcome)).toBeNull();
  });

  it('Should not steal a restored live seat away from home', async () => {
    const harness = buildHarness({ seated: true, flags: { onboarding: true } });
    render(() => <App services={harness.services} />);

    await waitFor(() => expect(screen.getByRole('button', { name: en.home.play })).toBeTruthy());
    expect(harness.services.nav.screen()).toBe('home');
    expect(harness.services.tutorial.offeringSit()).toBe(false);
  });

  it('Should not steal a join deep link', async () => {
    const harness = buildHarness({
      initialPath: '/join/ABC123',
      flags: { onboarding: true },
    });
    render(() => <App services={harness.services} />);

    await waitFor(() => expect(harness.services.nav.screen()).toBe('join-game'));
    expect(harness.services.tutorial.offeringSit()).toBe(false);
  });

  it('Should offer Sit once the onboarding flag arrives', async () => {
    const harness = buildHarness({ flags: { onboarding: false } });
    render(() => <App services={harness.services} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: en.home.play })).toBeTruthy(),
    );
    expect(screen.queryByText(en.onboard.piece.welcome)).toBeNull();

    harness.services.flags.apply({ ...DEFAULT_FLAGS, onboarding: true });
    await waitFor(() => expect(screen.getByText(en.onboard.piece.welcome)).toBeTruthy());
  });

  it('Should not offer Sit when onboarding is off', async () => {
    const harness = buildHarness({ flags: { onboarding: false } });
    render(() => <App services={harness.services} />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: en.home.play })).toBeTruthy(),
    );
    expect(harness.services.nav.screen()).toBe('home');
    expect(screen.queryByText(en.onboard.piece.welcome)).toBeNull();
    expect(harness.services.tutorial.offeringSit()).toBe(false);
  });
});

describe('App — guide while seated', () => {
  it('Should pull a waiting player off the guide when the match starts', async () => {
    const harness = buildHarness({ seated: true });
    render(() => <App services={harness.services} />);
    await waitFor(() => expect(harness.services.nav.screen()).toBe('home'));

    harness.services.nav.navigate('waiting-room');
    harness.pushState(makeView({ hostId: 'you', phase: Phase.Lobby }));
    harness.services.nav.navigate('rules');
    expect(harness.services.nav.screen()).toBe('rules');

    harness.pushState(makeView({ hostId: 'you', phase: Phase.Nomination }));
    expect(harness.services.nav.screen()).toBe('game');
  });

  it('Should leave the in-game guide open until the player goes back', async () => {
    const harness = buildHarness({ seated: true });
    render(() => <App services={harness.services} />);
    await waitFor(() => expect(harness.services.nav.screen()).toBe('home'));

    harness.services.nav.navigate('game');
    harness.pushState(makeView({ hostId: 'you', phase: Phase.Nomination }));
    harness.services.nav.navigate('rules');
    expect(harness.services.nav.screen()).toBe('rules');

    harness.pushState(makeView({ hostId: 'you', phase: Phase.Voting }));
    expect(harness.services.nav.screen()).toBe('rules');
  });
});
