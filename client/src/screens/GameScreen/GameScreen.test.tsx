import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { Phase } from '@secret-hitler/shared';
import { GameScreen } from './GameScreen';
import { LOOK_AT_MS, LOOK_MS, CEREMONY_MS } from './NightOverlay';
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

afterEach(() => {
  rs.restoreAllMocks();
});

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
    expect(screen.getByRole('button', { name: 'Ja!' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Nein!' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
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

  it('Should keep the vote cards after the player has voted', () => {
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

    const ja = screen.getByRole('button', { name: 'Ja!' });
    const nein = screen.getByRole('button', { name: 'Nein!' });
    expect(ja.getAttribute('aria-pressed')).toBe('true');
    expect(nein.getAttribute('aria-pressed')).toBe('false');
    expect(ja).toHaveProperty('disabled', true);
    expect(nein).toHaveProperty('disabled', true);
    expect(screen.getByText(/waiting for others/i)).toBeTruthy();
  });

  it('Should keep the vote dock on the table so seats stay in view', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    expect(document.querySelector('[data-game-table] [data-ballot-pile]')).toBeTruthy();
    expect(document.querySelector('[data-seat-id="cal"]')).toBeTruthy();
  });

  it('Should let the player drag the vote panel aside', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    const handle = screen.getByRole('separator', { name: en.game.moveDialog });
    fireEvent.pointerDown(handle, {
      button: 0,
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    fireEvent.pointerMove(handle, { clientX: 50, clientY: 40, pointerId: 1 });

    expect(screen.getByRole('dialog').parentElement?.style.transform).toBe(
      'translate(40px, 30px)',
    );
  });

  it('Should throw a face-down ballot onto the table when the player votes', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: 'Ja!' }));
    await waitFor(() => {
      expect(document.querySelector('[data-ballot="you"]')).toBeTruthy();
    });
  });

  it('Should play a ballot effect when the player votes', () => {
    const harness = buildHarness({ seated: true });
    const play = rs.spyOn(harness.services.sound, 'play');
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: 'Ja!' }));

    expect(play).toHaveBeenCalledWith('ballot-tap');
    expect(play).toHaveBeenCalledWith('ballot-slide');
  });

  it('Should throw a face-down ballot when someone else votes', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState(view);
    harness.pushState({
      ...view,
      players: view.players.map((player) =>
        player.id === 'cal' ? { ...player, hasVoted: true } : player,
      ),
    });

    await waitFor(() => {
      expect(document.querySelector('[data-ballot="cal"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-ballot="you"]')).toBeNull();
  });

  it('Should play a ballot effect when someone else votes', () => {
    const harness = buildHarness({ seated: true });
    const play = rs.spyOn(harness.services.sound, 'play');
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState(view);
    play.mockClear();
    harness.pushState({
      ...view,
      players: view.players.map((player) =>
        player.id === 'cal' ? { ...player, hasVoted: true } : player,
      ),
    });

    expect(play).toHaveBeenCalledWith('ballot-slide');
  });

  it('Should stack already-cast ballots when joining a vote late', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      players: view.players.map((player) =>
        player.id === 'cal' || player.id === 'pres'
          ? { ...player, hasVoted: true }
          : player,
      ),
    });

    await waitFor(() => {
      expect(document.querySelector('[data-ballot="cal"]')).toBeTruthy();
      expect(document.querySelector('[data-ballot="pres"]')).toBeTruthy();
    });
  });

  it('Should show the secret role on the deck strip after the opening look', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());
    harness.socket.emit({ type: 'private', role: 'liberal' });

    expect(
      screen.getByLabelText(en.game.youAreRole.replace('{role}', en.role.liberal)),
    ).toBeTruthy();
    expect(screen.getByText(en.role.liberal)).toBeTruthy();
    expect(screen.queryByText(en.ravi.private.youLiberal)).toBeNull();
  });

  it('Should open the role card when the player taps their role', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(nominationView());

    fireEvent.click(
      screen.getByRole('button', {
        name: en.game.youAreRole.replace('{role}', en.role.liberal),
      }),
    );
    expect(screen.getByText(en.roleDescription.liberal)).toBeTruthy();
    expect(screen.getByRole('dialog', { name: en.game.yourRole })).toBeTruthy();

    fireEvent.click(screen.getByRole('dialog', { name: en.game.yourRole }));
    expect(screen.queryByText(en.roleDescription.liberal)).toBeNull();
  });

  it('Should deal face-down cards when the game has just started', async () => {
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

    await waitFor(() => {
      expect(screen.getByText(en.ravi.deal.start)).toBeTruthy();
    });
    expect(screen.getAllByText(en.ravi.deal.start)).toHaveLength(1);
    expect(screen.queryByText(en.ravi.private.youLiberal)).toBeNull();
    expect(screen.queryByText(en.ravi.night.start)).toBeNull();
    expect(document.querySelector('[data-seat-number]')).toBeNull();
    expect(screen.queryByText(en.game.president)).toBeNull();
    expect(screen.getByPlaceholderText(en.game.chatSilentPlaceholder)).toBeTruthy();
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
    expect(screen.queryByRole('button', { name: en.game.gotIt })).toBeNull();
    expect(screen.getByRole('dialog', { name: en.game.yourRole })).toBeTruthy();
    expect(screen.queryByText(en.game.government.first)).toBeNull();
  });

  it('Should open the night glance on the shared clock, not on Got it', async () => {
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

    expect(screen.getByLabelText(en.ravi.private.nightLiberal)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.game.gotIt })).toBeNull();
    expect(screen.queryByText(en.game.government.first)).toBeNull();
    await waitFor(() => {
      expect(screen.getByText(en.ravi.private.nightLiberal)).toBeTruthy();
    });
  });

  it('Should dismiss the night look when voting starts', async () => {
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
    await waitFor(() => {
      expect(screen.getByText(en.ravi.deal.start)).toBeTruthy();
    });

    harness.pushState(votingView());
    expect(screen.queryByRole('dialog', { name: en.ravi.deal.start })).toBeNull();
    expect(screen.queryByRole('dialog', { name: en.game.yourRole })).toBeNull();
    expect(screen.getByText(en.game.chancellorRevealTitleYou)).toBeTruthy();
    expect(screen.getByText(en.game.chancellorRevealYou)).toBeTruthy();
  });

  it('Should reveal seat numbers and the President after night', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, chancellor: null },
      discussionDeadline: {
        startedAt: Date.now() - CEREMONY_MS - 5_000,
        endsAt: Date.now() + 20_000,
      },
      you: { ...view.you, role: 'liberal' },
    });

    expect(screen.queryByRole('dialog', { name: en.ravi.deal.start })).toBeNull();
    expect(document.querySelector('[data-seat-number]')).toBeTruthy();
    expect(screen.getByText(en.game.president)).toBeTruthy();
    expect(screen.getByPlaceholderText(en.game.chatPlaceholder)).toBeTruthy();
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

    fireEvent.click(screen.getByRole('button', { name: /Ana/ }));
    expect(harness.socket.lastSent('command')).toEqual({
      type: 'command',
      command: { kind: 'nominateChancellor', targetId: 'pres' },
    });
  });

  it('Should explain why a disconnected player cannot be Chancellor', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = nominationView();
    harness.pushState({
      ...view,
      players: view.players.map((player) =>
        player.id === 'cal' ? { ...player, connected: false } : player,
      ),
    });

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(screen.getByText(en.game.nominateAbsent)).toBeTruthy();
    expect(harness.socket.lastSent('command')).toBeUndefined();
  });

  it('Should not let the President pick seats until nomination is open', () => {
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

    const cal = screen.getByRole('button', { name: /Cal/ });
    expect(cal.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(cal);
    expect(screen.queryByText(en.game.nominateIneligible)).toBeNull();
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
    expect(
      screen.getByRole('button', { name: en.game.startNomination }),
    ).toBeTruthy();
    expect(screen.queryByText(en.game.chat)).toBeNull();
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

  it('Should let the President investigate the last government', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.SpecialPower,
      activePower: 'investigate',
      board: { ...view.board, president: 'you', chancellor: 'cal' },
      ineligibleChancellors: ['cal', 'pres'],
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
    expect(screen.queryByRole('button', { name: en.game.power.continue })).toBeNull();
    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.power.investigatedFascist);
    });
  });

  it('Should keep the investigated party on that seat for the President', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    const powerView = {
      ...view,
      phase: Phase.SpecialPower,
      activePower: 'investigate' as const,
      board: { ...view.board, president: 'you', chancellor: 'cal' },
      players: view.players.map((player) =>
        player.id === 'you' ? { ...player, isPresident: true } : player,
      ),
    };
    harness.pushState(powerView);
    harness.socket.emit({
      type: 'log',
      entry: {
        id: 'log-1',
        code: 'investigated',
        params: { name: 'Cal' },
        at: Date.now(),
      },
    });
    harness.pushState({
      ...powerView,
      you: { ...powerView.you, investigation: { name: 'Cal', party: 'fascist' } },
      players: powerView.players.map((player) =>
        player.id === 'cal' ? { ...player, party: 'fascist' as const } : player,
      ),
    });

    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.power.investigatedFascist);
    });
    await waitFor(() => {
      expect(harness.socket.lastSent('command')).toEqual({
        type: 'command',
        command: { kind: 'useSpecialPower', targetId: '' },
      });
    });

    harness.pushState({
      ...powerView,
      phase: Phase.Nomination,
      activePower: null,
      you: { ...powerView.you, investigation: null },
      players: powerView.players.map((player) =>
        player.id === 'cal' ? { ...player, party: 'fascist' as const } : player,
      ),
    });

    expect(document.querySelector('[data-seat-id="cal"] [data-party="fascist"]')).toBeTruthy();
  });

  it('Should not re-investigate a player the President already checked', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.SpecialPower,
      activePower: 'investigate' as const,
      board: { ...view.board, president: 'you', chancellor: 'cal' },
      players: view.players.map((player) =>
        player.id === 'cal' ? { ...player, party: 'fascist' as const } : player,
      ),
    });

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(screen.getByText(en.game.power.alreadyInvestigated)).toBeTruthy();
    expect(harness.socket.lastSent('command')).toBeUndefined();
  });

  it('Should not show the party card to the player being investigated', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.SpecialPower,
      activePower: 'investigate' as const,
      you: { ...view.you, role: 'fascist', investigation: null },
    });
    harness.socket.emit({
      type: 'log',
      entry: {
        id: 'log-1',
        code: 'investigated',
        params: { name: 'You' },
        at: Date.now(),
      },
    });

    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.power.investigatedYou);
    });
    expect(screen.queryByRole('button', { name: en.game.power.continue })).toBeNull();
    expect(
      screen.queryByText(
        en.game.power.investigationResult
          .replace('{name}', 'You')
          .replace('{party}', en.game.fascist),
      ),
    ).toBeNull();
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

  it('Should show an investigated party in the modal when the role stays hidden', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      players: view.players.map((player) =>
        player.id === 'cal' ? { ...player, party: 'fascist' as const } : player,
      ),
    });

    openPlayers();
    expect(screen.getByText(en.game.fascist)).toBeTruthy();
    expect(screen.queryByText(en.role.hitler)).toBeNull();
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

    const liberal = await waitFor(() =>
      screen.getByRole('button', { name: en.game.liberal }),
    );
    fireEvent.click(liberal);
    // The pick plays an exit animation (a resolved no-op under jsdom) first.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(harness.socket.lastSent('command')).toEqual({
      type: 'command',
      command: { kind: 'discardPolicy', index: 0 },
    });
  });

  it('Should show the public deal to everyone while the President chooses', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.PresidentLegislative,
      board: { ...view.board, president: 'pres', chancellor: 'you' },
    });

    expect(screen.getByText(en.game.legislativeDeal)).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText(/is choosing a policy to discard/)).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: en.game.liberal })).toBeNull();
  });

  it('Should tick the draw pile down as cards are dealt', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState(view);
    expect(screen.getByLabelText(`${en.game.drawPile}: 17`)).toBeTruthy();

    harness.pushState({
      ...view,
      phase: Phase.PresidentLegislative,
      board: {
        ...view.board,
        president: 'pres',
        chancellor: 'you',
        drawPile: 14,
      },
      legislativeDeadline: {
        startedAt: Date.now() + 8_000,
        endsAt: Date.now() + 28_000,
      },
    });

    expect(screen.getByLabelText(`${en.game.drawPile}: 17`)).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByLabelText(`${en.game.drawPile}: 14`)).toBeTruthy();
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
    expect(screen.getByText(en.role.liberal)).toBeTruthy();
    expect(screen.queryByText(en.game.presidentialCandidate)).toBeNull();
    // The seated president's name is surfaced, no info panel to open.
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
  });

  it('Should put the current player first, then wrap around the table', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    const rows = document.querySelectorAll('[data-game-table] [role="list"]');
    const ids = (row: Element) =>
      [...row.querySelectorAll('[data-seat-id]')].map((seat) =>
        seat.getAttribute('data-seat-id'),
      );
    expect(ids(rows[1])).toEqual(['you', 'cal']);
    expect(ids(rows[0])).toEqual(['pres']);
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

  it('Should close the menu from the shared back action before asking to leave', () => {
    const harness = buildHarness({ seated: true });
    harness.services.nav.navigate('game');
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: en.settings.title }));
    expect(screen.getByRole('button', { name: en.gameMenu.music })).toBeTruthy();

    harness.services.nav.requestBack();
    expect(screen.queryByRole('button', { name: en.gameMenu.music })).toBeNull();
    expect(screen.queryByText(en.leaveDialog.message)).toBeNull();
    expect(harness.services.nav.screen()).toBe('game');

    harness.services.nav.requestBack();
    expect(screen.getByText(en.leaveDialog.message)).toBeTruthy();
    expect(harness.services.nav.screen()).toBe('game');
  });
});

describe('GameScreen — docked chat', () => {
  it('Should show chat on the board without leaving the table', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    expect(screen.getByPlaceholderText(en.game.chatPlaceholder)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.game.playersTitle })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.settings.title })).toBeTruthy();
  });

  it('Should show an incoming message on the docked panel', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    harness.socket.emit({
      type: 'chat',
      message: { id: 'm1', playerId: 'cal', name: 'Cal', text: 'hi', at: 0 },
    });
    expect(screen.getByText('hi')).toBeTruthy();
    expect(harness.services.game.unreadChat()).toBe(0);
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
