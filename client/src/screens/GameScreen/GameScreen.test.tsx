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

  it('Should show the status row with the player\'s secret role', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());
    harness.socket.emit({ type: 'private', role: 'liberal' });

    expect(
      screen.getByLabelText(en.game.youAreRole.replace('{role}', en.role.liberal)),
    ).toBeTruthy();
  });
});

function openPlayers() {
  fireEvent.click(screen.getByRole('button', { name: en.game.playersTitle }));
}

describe('GameScreen — nomination', () => {
  it('Should nominate a player from the nomination modal', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, president: 'you', chancellor: null },
    });

    // The nomination modal auto-opens for the President — no need to open it.
    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(harness.socket.lastSent('command')).toEqual({
      type: 'command',
      command: { kind: 'nominateChancellor', targetId: 'cal' },
    });
  });

  it('Should notify the table when a government fails', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const base = votingView();
    harness.pushState(base);
    harness.pushState({
      ...base,
      phase: Phase.Nomination,
      board: { ...base.board, electionTracker: 1 },
    });

    expect(screen.getByText(/election tracker is now 1 of 3/i)).toBeTruthy();
  });

  it('Should end the round from the nomination modal', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, president: 'you', chancellor: null },
    });

    fireEvent.click(screen.getByRole('button', { name: en.game.endRound }));
    expect(harness.socket.lastSent('command')).toEqual({
      type: 'command',
      command: { kind: 'endTurn' },
    });
  });
});

describe('GameScreen — players modal', () => {
  it('Should hide role labels the server has not revealed', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    openPlayers();
    // Other players' roles are null in the view — no role label rendered.
    expect(screen.queryByText(en.role.hitler)).toBeNull();
  });

  it('Should show a revealed role label in the modal', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      players: view.players.map((player) =>
        player.id === 'cal' ? { ...player, role: 'hitler' as const } : player,
      ),
    });

    openPlayers();
    expect(screen.getByText(en.role.hitler)).toBeTruthy();
  });
});

describe('GameScreen — legislative modal', () => {
  it('Should send a discard when the President picks a card', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.PresidentLegislative,
      board: { ...view.board, president: 'you', chancellor: 'cal' },
      you: {
        ...view.you,
        policies: ['liberal', 'fascist', 'fascist'],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: en.game.liberal }));
    // The pick plays an exit animation (a resolved no-op under jsdom) first.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(harness.socket.lastSent('command')).toEqual({
      type: 'command',
      command: { kind: 'discardPolicy', index: 0 },
    });
  });
});

describe('GameScreen — info panel', () => {
  it('Should reveal round details behind the info button', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    // Election tracker and government live in the info panel, not the board.
    expect(screen.queryByText(en.game.electionTracker)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: en.game.infoTitle }));
    expect(screen.getByText(en.game.electionTracker)).toBeTruthy();
    expect(screen.getByText(en.game.president)).toBeTruthy();
  });
});

describe('GameScreen — in-game menu', () => {
  it('Should open the settings menu from the gear button', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: en.settings.title }));
    expect(screen.getByRole('button', { name: en.gameMenu.music })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.gameMenu.effects })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.gameMenu.viewRules })).toBeTruthy();
  });

  it('Should ask for confirmation when quitting from the menu', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: en.settings.title }));
    fireEvent.click(screen.getByRole('button', { name: en.gameMenu.quit }));
    expect(screen.getByText(en.leaveDialog.message)).toBeTruthy();
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
