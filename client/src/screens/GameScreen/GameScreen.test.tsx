import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { Phase } from '@secret-hitler/shared';
import { GameScreen } from './GameScreen';
import { en } from '../../i18n/locales/en';
import { buildHarness, makePlayer, makeView, renderWithApp } from '../../../test/test-utils';

// Sourced from the catalog so the assertion follows the i18n text, not a literal.
const SECONDS_PATTERN = new RegExp(`^${en.game.secondsLeft.replace('{seconds}', '\\d+')}$`);

function votingView() {
  return makeView({
    phase: Phase.Voting,
    hostId: 'pres',
    players: [
      makePlayer({ id: 'pres', name: 'Ana', seat: 0, isPresident: true }),
      makePlayer({ id: 'you', name: 'You', seat: 1, isChancellor: true }),
      makePlayer({ id: 'cal', name: 'Cal', seat: 2 }),
    ],
    board: {
      liberalPolicies: 0,
      fascistPolicies: 0,
      electionTracker: 0,
      drawPile: 17,
      discardPile: 0,
      president: 'pres',
      chancellor: 'you',
      lastEnacted: [],
    },
    you: { id: 'you', role: 'liberal', vote: null, policies: [], peek: [], investigation: null },
  });
}

describe('GameScreen — voting', () => {
  it('Should send a Ja vote when the player picks it', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: 'Ja!' }));
    expect(harness.socket.lastSent('command')).toEqual({
      type: 'command',
      command: { kind: 'castVote', vote: 'ja' },
    });
  });

  it('Should send a Nein vote when the player picks it', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: 'Nein!' }));
    expect(harness.socket.lastSent('command')).toEqual({
      type: 'command',
      command: { kind: 'castVote', vote: 'nein' },
    });
  });

  it('Should hide the vote buttons after the player has voted', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      you: { ...view.you, vote: 'ja' },
      players: view.players.map((player) =>
        player.id === 'you' ? { ...player, hasVoted: true } : player,
      ),
    });

    expect(screen.queryByRole('button', { name: 'Ja!' })).toBeNull();
    expect(screen.getByText(/waiting for others/i)).toBeTruthy();
  });

  it('Should show the role card with the player\'s secret role', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());
    harness.socket.emit({ type: 'private', role: 'liberal' });

    expect(screen.getByText('Your Role')).toBeTruthy();
    expect(screen.getByText('Find and stop Hitler. Pass 5 Liberal policies to win.')).toBeTruthy();
  });
});

describe('GameScreen — timer setting', () => {
  it('Should hide the vote countdown when the Timer setting is off', () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('timerEnabled', false);
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    expect(screen.queryByText(SECONDS_PATTERN)).toBeNull();
  });

  it('Should show the vote countdown when the Timer setting is on', () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('timerEnabled', true);
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    expect(screen.getByText(SECONDS_PATTERN)).toBeTruthy();
  });
});
