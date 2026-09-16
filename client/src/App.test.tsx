import { describe, expect, it } from '@rstest/core';
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { Phase } from '@secret-hitler/shared';
import { App } from './App';
import { en } from './i18n/locales/en';
import { TUTORIAL_ANNOUNCE_LIMIT, TUTORIAL_SEEN_COUNT_KEY } from './services/TutorialPromptService';
import { buildHarness, makeView } from '../test/test-utils';

describe('App — first-run guide', () => {
  it('Should open the guide after splash on a first visit', async () => {
    const harness = buildHarness();
    render(() => <App services={harness.services} />);

    await waitFor(() => expect(harness.services.nav.screen()).toBe('rules'));
    expect(screen.getByRole('heading', { name: en.rules.title })).toBeTruthy();
    expect(screen.getByText(en.tutorial.announce)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.tutorial.continue })).toBeTruthy();
  });

  it('Should remember a dismissed announcement and stay on the guide', async () => {
    const harness = buildHarness();
    render(() => <App services={harness.services} />);
    await waitFor(() => expect(harness.services.nav.screen()).toBe('rules'));

    fireEvent.click(screen.getByRole('button', { name: en.tutorial.continue }));
    expect(localStorage.getItem(TUTORIAL_SEEN_COUNT_KEY)).toBe('1');
    expect(harness.services.nav.screen()).toBe('rules');
    expect(screen.queryByText(en.tutorial.announce)).toBeNull();
  });

  it('Should count leaving the guide as seeing the announcement', async () => {
    const harness = buildHarness();
    render(() => <App services={harness.services} />);
    await waitFor(() => expect(harness.services.nav.screen()).toBe('rules'));

    fireEvent.click(screen.getByRole('button', { name: en.common.goBack }));
    expect(harness.services.nav.screen()).toBe('home');
    expect(localStorage.getItem(TUTORIAL_SEEN_COUNT_KEY)).toBe('1');
  });

  it('Should go home after splash once the guide has been seen five times', async () => {
    localStorage.setItem(TUTORIAL_SEEN_COUNT_KEY, String(TUTORIAL_ANNOUNCE_LIMIT));
    const harness = buildHarness();
    render(() => <App services={harness.services} />);

    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(en.home.findGame) })).toBeTruthy());
    expect(harness.services.nav.screen()).toBe('home');
    expect(screen.queryByText(en.tutorial.announce)).toBeNull();
  });

  it('Should not steal a restored live seat away from home', async () => {
    const harness = buildHarness({ seated: true });
    render(() => <App services={harness.services} />);

    await waitFor(() => expect(screen.getByRole('button', { name: new RegExp(en.home.findGame) })).toBeTruthy());
    expect(harness.services.nav.screen()).toBe('home');
    expect(harness.services.tutorial.announcing()).toBe(false);
  });

  it('Should not steal a join deep link', async () => {
    const harness = buildHarness({ initialPath: '/join/ABC123' });
    render(() => <App services={harness.services} />);

    await waitFor(() => expect(harness.services.nav.screen()).toBe('join-game'));
    expect(harness.services.tutorial.announcing()).toBe(false);
  });
});

describe('App — guide while seated', () => {
  it('Should pull a waiting player off the guide when the match starts', async () => {
    localStorage.setItem(TUTORIAL_SEEN_COUNT_KEY, String(TUTORIAL_ANNOUNCE_LIMIT));
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
    localStorage.setItem(TUTORIAL_SEEN_COUNT_KEY, String(TUTORIAL_ANNOUNCE_LIMIT));
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
