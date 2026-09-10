import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { Phase } from '@secret-hitler/shared';
import { GameScreen } from './GameScreen';
import { LOOK_AT_MS, LOOK_MS } from './NightOverlay';
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

  it('Should hide the secret role on the table after the opening look', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());
    harness.socket.emit({ type: 'private', role: 'liberal' });

    expect(
      screen.queryByLabelText(en.game.youAreRole.replace('{role}', en.role.liberal)),
    ).toBeNull();
    expect(screen.queryByText(en.ravi.private.youLiberal)).toBeNull();
  });

  it('Should deal face-down cards when the game has just started', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, chancellor: null },
      discussionDeadline: { startedAt: Date.now(), endsAt: Date.now() + 20_000 },
      you: { ...view.you, role: 'liberal' },
    });

    expect(screen.getByText(en.ravi.deal.start)).toBeTruthy();
    expect(screen.queryByText(en.ravi.private.youLiberal)).toBeNull();
    expect(screen.queryByText(en.ravi.night.start)).toBeNull();
  });

  it('Should open the private role look after the deal and night', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, chancellor: null },
      discussionDeadline: {
        startedAt: Date.now() - LOOK_AT_MS - 200,
        endsAt: Date.now() + 20_000,
      },
      you: { ...view.you, role: 'liberal' },
    });

    expect(screen.getByText(en.ravi.private.youLiberal)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.game.gotIt })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.game.gotIt }));
    expect(screen.queryByText(en.ravi.private.youLiberal)).toBeNull();
    expect(screen.queryByRole('button', { name: en.game.gotIt })).toBeNull();
    expect(screen.queryByText(en.ravi.private.nightLiberal)).toBeNull();
    expect(screen.getByRole('dialog', { name: en.game.yourRole })).toBeTruthy();
  });

  it('Should open the night glance on the shared clock, not on Got it', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, chancellor: null },
      discussionDeadline: {
        startedAt: Date.now() - LOOK_AT_MS - LOOK_MS - 500,
        endsAt: Date.now() + 20_000,
      },
      you: { ...view.you, role: 'liberal' },
    });

    expect(screen.getByText(en.ravi.private.nightLiberal)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.game.gotIt })).toBeNull();
  });

  it('Should dismiss the night look when voting starts', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, chancellor: null },
      discussionDeadline: { startedAt: Date.now(), endsAt: Date.now() + 20_000 },
      you: { ...view.you, role: 'liberal' },
    });
    expect(screen.getByText(en.ravi.deal.start)).toBeTruthy();

    harness.pushState(votingView());
    expect(screen.queryByText(en.ravi.deal.start)).toBeNull();
    expect(screen.getByText(en.game.chancellorRevealTitleYou)).toBeTruthy();
    expect(screen.getByText(en.game.chancellorRevealYou)).toBeTruthy();
  });

  it('Should name another player when they are nominated Chancellor', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, chancellor: null },
    });
    harness.pushState({
      ...view,
      board: { ...view.board, chancellor: 'cal' },
      players: view.players.map((player) => ({
        ...player,
        isChancellor: player.id === 'cal',
      })),
    });

    expect(screen.getByText(en.game.chancellorRevealTitle)).toBeTruthy();
    expect(screen.queryByText(en.game.chancellorRevealYou)).toBeNull();
  });

  it('Should ask the nominated chancellor to vote in the first person', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    expect(screen.getByText(en.game.votePromptYou)).toBeTruthy();
  });

  it(
    'Should announce the vote only after the chancellor reveal closes',
    async () => {
      const harness = buildHarness({ seated: true });
      harness.services.settings.set('raviVoice', false);
      renderWithApp(() => <GameScreen />, harness);
      const named = votingView();
      harness.pushState({
        ...named,
        phase: Phase.Nomination,
        board: { ...named.board, chancellor: null },
        nominationDeadline: { startedAt: 0, endsAt: Date.now() + 10_000 },
      });
      harness.pushState(named);

      expect(screen.getByText(en.game.chancellorRevealTitleYou)).toBeTruthy();
      expect(screen.queryByText(en.ravi.vote.start)).toBeNull();

      await waitFor(
        () => {
          expect(screen.queryByText(en.game.chancellorRevealTitleYou)).toBeNull();
          expect(screen.getByText(en.ravi.vote.start)).toBeTruthy();
        },
        { timeout: 8_000 },
      );
    },
    12_000,
  );
});

function openPlayers() {
  fireEvent.click(screen.getByRole('button', { name: en.game.playersTitle }));
}

// A nomination view where it's the viewer's turn to nominate (window open).
function nominationView() {
  const view = votingView();
  return {
    ...view,
    phase: Phase.Nomination,
    board: { ...view.board, president: 'you', chancellor: null },
    nominationDeadline: { startedAt: 0, endsAt: Date.now() + 10_000 },
  };
}

describe('GameScreen — nomination', () => {
  it('Should nominate a player from the table', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(nominationView());

    // Eligible seats are on the table — no nomination modal.
    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(harness.socket.lastSent('command')).toEqual({
      type: 'command',
      command: { kind: 'nominateChancellor', targetId: 'cal' },
    });
  });

  it('Should explain why a previous-government player cannot be Chancellor', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState({
      ...nominationView(),
      ineligibleChancellors: ['cal'],
    });

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(screen.getByText(en.game.nominateIneligible)).toBeTruthy();
    expect(harness.socket.lastSent('command')).toBeUndefined();
  });

  it('Should explain the term limit even before nomination opens', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, president: 'you', chancellor: null },
      discussionDeadline: { startedAt: 0, endsAt: Date.now() + 20_000 },
      nominationDeadline: null,
      ineligibleChancellors: ['cal'],
    });

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(screen.getByText(en.game.nominateIneligible)).toBeTruthy();
    expect(harness.socket.lastSent('command')).toBeUndefined();
  });

  it('Should keep the nomination modal closed during discussion', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    // Discussion is open, but the nomination window has not opened.
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, president: 'you', chancellor: null },
      discussionDeadline: { startedAt: 0, endsAt: Date.now() + 20_000 },
      nominationDeadline: null,
    });

    expect(screen.queryByText(en.game.nominateTitle)).toBeNull();
    expect(screen.getByText(en.game.discussionOpen)).toBeTruthy();
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

  it('Should dismiss the failed-election notice when a new overlay opens', () => {
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

    harness.pushState(votingView());
    expect(screen.queryByText(/election tracker is now 1 of 3/i)).toBeNull();
    expect(
      screen.getByText(en.game.chancellorRevealTitleYou),
    ).toBeTruthy();
  });

  it('Should end the round from the table tools', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(nominationView());

    fireEvent.click(screen.getByRole('button', { name: en.game.endRound }));
    expect(harness.socket.lastSent('command')).toEqual({
      type: 'command',
      command: { kind: 'endTurn' },
    });
  });
});

describe('GameScreen — presidential power', () => {
  it('Should investigate a player from the table', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.SpecialPower,
      activePower: 'investigate',
      board: { ...view.board, president: 'you', chancellor: 'cal' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(harness.socket.lastSent('command')).toEqual({
      type: 'command',
      command: { kind: 'useSpecialPower', targetId: 'cal' },
    });
  });

  it('Should reveal the party card in the centre after investigating', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    const powerView = {
      ...view,
      phase: Phase.SpecialPower,
      activePower: 'investigate' as const,
      board: { ...view.board, president: 'you', chancellor: 'cal' },
    };
    harness.pushState(powerView);

    // The public log is broadcast before the President's private snapshot.
    harness.socket.emit({
      type: 'log',
      entry: {
        id: 'log-1',
        code: 'investigated',
        params: { name: 'Cal' },
        at: Date.now(),
      },
    });
    const caption = new RegExp(
      `${en.game.fascist} party`,
    );
    expect(screen.queryByText(caption)).toBeNull();

    harness.pushState({
      ...powerView,
      you: { ...powerView.you, investigation: { name: 'Cal', party: 'fascist' } },
    });

    await waitFor(() => {
      expect(screen.getByText(caption)).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: en.game.power.continue })).toBeTruthy();
    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.power.investigatedFascist);
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

describe('GameScreen — government', () => {
  it('Should show the president, chancellor and election tracker on the table', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    expect(screen.getByText(en.game.president)).toBeTruthy();
    expect(screen.getByText(en.game.chancellor)).toBeTruthy();
    expect(screen.getByText(en.game.electionTracker)).toBeTruthy();
    expect(screen.getByLabelText(`${en.game.drawPile}: 17`)).toBeTruthy();
    expect(screen.getByText(en.game.presidentialCandidate)).toBeTruthy();
    // The seated president's name is surfaced, no info panel to open.
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
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
    expect(screen.getByRole('button', { name: en.gameMenu.ravi })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.gameMenu.viewRules })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ja!' })).toBeNull();
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

describe('GameScreen — chat page', () => {
  it('Should open the chat page from the chat button', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: en.game.openChat }));
    expect(harness.services.nav.screen()).toBe('chat');
  });

  it('Should track unread chat while the player is on the board', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    harness.socket.emit({
      type: 'chat',
      message: { id: 'm1', playerId: 'cal', name: 'Cal', text: 'hi', at: 0 },
    });
    expect(harness.services.game.unreadChat()).toBe(1);
  });

  it('Should not badge the player for their own message', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    harness.socket.emit({
      type: 'chat',
      message: { id: 'm1', playerId: 'you', name: 'You', text: 'mine', at: 0 },
    });
    expect(harness.services.game.unreadChat()).toBe(0);
  });
});

describe('GameScreen — event header', () => {
  it('Should announce the current instruction as the first government', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    expect(screen.getByText(en.game.help.voteYou)).toBeTruthy();
    expect(screen.getByText(en.game.government.first)).toBeTruthy();
  });

  it('Should advance the government label after a fascist policy is enacted', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      board: {
        ...view.board,
        fascistPolicies: 1,
        lastEnacted: ['fascist'],
      },
    });

    expect(screen.getByText(en.game.help.voteYou)).toBeTruthy();
    expect(screen.getByText(en.game.government.second)).toBeTruthy();
  });

  it('Should wait on the president during nomination', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState({
      ...votingView(),
      phase: Phase.Nomination,
      board: { ...votingView().board, president: 'pres', chancellor: null },
      nominationDeadline: { startedAt: 0, endsAt: Date.now() + 10_000 },
    });

    expect(screen.getByText(/Waiting for.*Ana.*nominate/i)).toBeTruthy();
  });
});

describe('GameScreen — help bar', () => {
  it('Should show the current instruction in the header', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    expect(screen.getByText(en.game.help.voteYou)).toBeTruthy();
  });

  it('Should send an emoji through chat', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: en.game.emojis }));
    fireEvent.click(screen.getByRole('button', { name: '👍' }));
    expect(harness.socket.lastSent('chat:message')).toEqual({
      type: 'chat:message',
      text: '👍',
    });
  });
});

describe('GameScreen — vote timer', () => {
  it('Should show the vote countdown on the ballot', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState({
      ...votingView(),
      voteDeadline: { startedAt: Date.now(), endsAt: Date.now() + 30_000 },
    });

    expect(screen.getByText(SECONDS_PATTERN)).toBeTruthy();
  });
});

describe('GameScreen — execution', () => {
  it('Should let the executed player stay and watch', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, chancellor: null },
    });
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, chancellor: null },
      players: view.players.map((player) =>
        player.id === 'you' ? { ...player, isAlive: false } : player,
      ),
    });

    expect(screen.getByText(en.game.killed.title)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.game.killed.stay }));
    expect(screen.queryByText(en.game.killed.title)).toBeNull();
  });
});

describe('GameScreen — game over', () => {
  it('Should wait for Ravi to reveal roles before listing them', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, chancellor: null },
    });
    harness.socket.emit({
      type: 'log',
      entry: { id: 'win-1', code: 'liberalsWin', at: Date.now() },
    });
    harness.pushState({
      ...view,
      phase: Phase.GameOver,
      winner: 'liberal',
      players: view.players.map((player) => ({
        ...player,
        role:
          player.id === 'pres'
            ? 'hitler'
            : player.id === 'cal'
              ? 'fascist'
              : 'liberal',
      })),
    });

    expect(screen.getAllByText(en.game.over.liberalsWin).length).toBeGreaterThan(0);
    expect(screen.queryByText(en.role.hitler)).toBeNull();

    await waitFor(
      () => {
        expect(screen.getByText(en.role.hitler)).toBeTruthy();
      },
      { timeout: 3_000 },
    );
  });
});
