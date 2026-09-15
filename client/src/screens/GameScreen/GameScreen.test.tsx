import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, screen, waitFor, within } from '@solidjs/testing-library';
import { Phase } from '@secret-hitler/shared';
import { GameScreen } from './GameScreen';
import { LOOK_AT_MS, LOOK_MS, CEREMONY_MS } from './NightOverlay';
import { en } from '../../i18n/locales/en';
import { isolateBidi } from '../../i18n/utils';
import { CARD_BACK, VOTE_BACK, VOTE_FACE } from '../../assets/cards';
import { buildHarness, makePlayer, makeView, renderWithApp, stubDeniedMicrophone } from '../../../test/test-utils';

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
    you: {
      id: 'you',
      role: 'liberal',
      vote: null,
      policies: [],
      peek: [],
      investigation: null,
      canRequestKick: true,
    },
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
    expect(screen.queryByRole('button', { name: 'Ja!' })).toBeNull();
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

  it('Should hide the vote dialog after the player has voted and show a back on their seat', () => {
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
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('[data-ballot="you"]')).toBeTruthy();
    expect(
      document.querySelector('[data-ballot="you"]')?.getAttribute('data-ballot-face'),
    ).toBe('back');
    expect(document.querySelector('[data-chat-ballot]')).toBeNull();
  });

  it('Should keep seats in view while the vote prompt is open', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(document.querySelector('[data-seat-id="cal"]')).toBeTruthy();
    expect(document.querySelector('[data-ballot-pile]')).toBeNull();
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

  it('Should show this player’s ballot face-down on their seat after they vote', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState(view);
    fireEvent.click(screen.getByRole('button', { name: 'Ja!' }));
    harness.pushState({
      ...view,
      you: { ...view.you, vote: 'ja' },
      players: view.players.map((player) =>
        player.id === 'you' ? { ...player, hasVoted: true } : player,
      ),
    });

    await waitFor(() => {
      expect(
        document.querySelector('[data-ballot="you"]')?.getAttribute('data-ballot-face'),
      ).toBe('back');
    });
  });

  it('Should play a ballot effect when the player votes', () => {
    const harness = buildHarness({ seated: true });
    const play = rs.spyOn(harness.services.sound, 'play');
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: 'Ja!' }));

    expect(play).toHaveBeenCalledWith('ballot-tap');
  });

  it('Should show a face-down ballot on another player’s seat when they vote', async () => {
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
    expect(document.querySelector('[data-ballot="cal"]')?.getAttribute('src')).toBe(
      VOTE_BACK,
    );
    expect(document.querySelector('[data-ballot="cal"]')?.getAttribute('src')).not.toBe(
      CARD_BACK,
    );
    expect(document.querySelector('[data-chat-ballot]')).toBeNull();
  });

  it('Should keep each ballot on its own seat after this player votes', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      you: { ...view.you, vote: 'nein' },
      players: view.players.map((player) =>
        player.id === 'you' || player.id === 'cal'
          ? { ...player, hasVoted: true }
          : player,
      ),
    });

    expect(document.querySelector('[data-ballot-pile]')).toBeNull();
    expect(document.querySelector('[data-ballot="you"]')?.getAttribute('data-ballot-face')).toBe(
      'back',
    );
    expect(document.querySelector('[data-ballot="cal"]')?.getAttribute('data-ballot-face')).toBe(
      'back',
    );
    expect(document.querySelector('[data-ballot="you"]')?.getAttribute('src')).toBe(VOTE_BACK);
    expect(document.querySelector('[data-ballot="cal"]')?.getAttribute('src')).toBe(VOTE_BACK);
    expect(document.querySelector('[data-chat-ballot]')).toBeNull();
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

  it('Should show already-cast ballots on their seats when joining a vote late', async () => {
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

  it('Should flip seat ballots to ja and nein once the votes are public', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.PresidentLegislative,
      voteDeadline: null,
      players: view.players.map((player) => ({
        ...player,
        hasVoted: true,
        vote: player.id === 'cal' ? 'nein' : 'ja',
      })),
    });

    expect(document.querySelector('[data-ballot="you"]')?.getAttribute('src')).toBe(
      VOTE_FACE.ja,
    );
    expect(document.querySelector('[data-ballot="cal"]')?.getAttribute('src')).toBe(
      VOTE_FACE.nein,
    );
    expect(document.querySelector('[data-chat-ballot]')).toBeNull();
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

  it('Should open the private role look after the deal and night', async () => {
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

    await waitFor(() => {
      expect(screen.getByText(en.ravi.private.youLiberal)).toBeTruthy();
    });
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

    await waitFor(() => {
      expect(screen.getByLabelText(en.ravi.private.nightLiberal)).toBeTruthy();
    });
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
    expect(
      document.querySelector('[data-seat-id="you"]')?.textContent,
    ).toMatch(/2/);
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

describe('GameScreen — presence', () => {
  it('Should have Ravi say a disconnected player might come back', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(nominationView());

    harness.socket.emit({
      type: 'log',
      entry: {
        id: 'away-1',
        code: 'disconnected',
        params: { name: 'Cal' },
        at: Date.now(),
      },
    });

    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(
        en.ravi.player.away.replace('{name}', isolateBidi('Cal')),
      );
    });
  });

  it('Should have Ravi welcome a returning player', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(nominationView());

    harness.socket.emit({
      type: 'log',
      entry: {
        id: 'back-1',
        code: 'reconnected',
        params: { name: 'Cal' },
        at: Date.now(),
      },
    });

    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(
        en.ravi.player.back.replace('{name}', isolateBidi('Cal')),
      );
    });
  });

  it('Should welcome the viewer back after they reconnect', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(nominationView());

    harness.socket.emit({
      type: 'log',
      entry: {
        id: 'back-you',
        code: 'reconnected',
        params: { name: 'You' },
        at: Date.now(),
      },
    });

    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe('Welcome back.');
    });
  });
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

  it('Should play a stamp when the President nominates from the table', () => {
    const harness = buildHarness({ seated: true });
    const play = rs.spyOn(harness.services.sound, 'play');
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(nominationView());
    play.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(play).toHaveBeenCalledWith('player-ready');
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

  it('Should knock when a locked seat is tapped', () => {
    const harness = buildHarness({ seated: true });
    const play = rs.spyOn(harness.services.sound, 'play');
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState({
      ...nominationView(),
      ineligibleChancellors: ['cal'],
    });
    play.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(play).toHaveBeenCalledWith('ui-error');
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

  it('Should not nominate until the nomination window is open', () => {
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
    // Discussion is still open and gameKick is off — seat is not a pick target.
    expect(cal.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(cal);
    expect(screen.queryByText(/Ask the table to remove/)).toBeNull();
    expect(harness.socket.lastSent('command')).toBeUndefined();
    expect(harness.socket.lastSent('kick:request')).toBeUndefined();
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
  });

  it('Should hide Choose Chancellor in chat when this player is not President', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.Nomination,
      board: { ...view.board, president: 'pres', chancellor: null },
      discussionDeadline: { startedAt: 0, endsAt: Date.now() + 20_000 },
      nominationDeadline: { startedAt: 0, endsAt: Date.now() + 10_000 },
    });

    expect(screen.queryByText(en.game.startNomination)).toBeNull();
    expect(screen.queryByRole('button', { name: en.game.endRound })).toBeNull();
  });

  it('Should not open a dialog when a government fails', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const base = votingView();
    harness.pushState(base);
    harness.pushState({
      ...base,
      phase: Phase.Nomination,
      board: { ...base.board, electionTracker: 1 },
    });

    expect(screen.queryByText(en.game.electionFailed.replace('{count}', '1'))).toBeNull();
    expect(screen.queryByText(en.game.discussionBody)).toBeNull();
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

  it('Should show the party card to the player being investigated', async () => {
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
    await waitFor(() => {
      expect(screen.getByAltText(en.game.fascist)).toBeTruthy();
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

  it('Should put the current player first so the row can start at the bottom right', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    const ids = [...document.querySelectorAll('[data-game-table] [data-seat-id]')].map(
      (seat) => seat.getAttribute('data-seat-id'),
    );
    expect(ids).toEqual(['you', 'cal', 'pres']);
  });

  it('Should keep clockwise seats after the viewer so wrapping fills left, then up', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(
      makeView({
        phase: Phase.Nomination,
        players: [
          makePlayer({ id: 'a', name: 'A', seat: 0 }),
          makePlayer({ id: 'b', name: 'B', seat: 1 }),
          makePlayer({ id: 'you', name: 'You', seat: 2 }),
          makePlayer({ id: 'd', name: 'D', seat: 3 }),
          makePlayer({ id: 'e', name: 'E', seat: 4 }),
        ],
      }),
    );

    const ids = [...document.querySelectorAll('[data-game-table] [data-seat-id]')].map(
      (seat) => seat.getAttribute('data-seat-id'),
    );
    expect(ids).toEqual(['you', 'd', 'e', 'a', 'b']);
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
    expect(screen.queryByRole('button', { name: en.gameMenu.tableVoice })).toBeNull();
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

  it('Should hide the microphone until the voice flag is on', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    expect(screen.queryByRole('button', { name: en.game.unmuteSelf })).toBeNull();
    expect(screen.queryByRole('button', { name: en.game.muteSelf })).toBeNull();
  });

  it('Should show the microphone and a local mute for other seats when voice is on', () => {
    stubDeniedMicrophone();
    const harness = buildHarness({ seated: true, flags: { voice: true } });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    expect(screen.getByRole('button', { name: en.game.unmuteSelf })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.settings.title }));
    expect(screen.getByRole('button', { name: en.gameMenu.tableVoice })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.common.goBack }));

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(screen.queryByRole('button', { name: en.game.playerMenu.report })).toBeNull();
    const muteCal = screen.getByRole('button', {
      name: en.game.mutePlayer.replace('{name}', 'Cal'),
    });
    fireEvent.click(muteCal);
    expect(harness.services.voice.isRemoteMuted('cal')).toBe(true);
    expect(harness.socket.lastSent('voice:mute')).toBeUndefined();
    expect(
      screen.queryByRole('button', { name: en.game.mutePlayer.replace('{name}', 'You') }),
    ).toBeNull();
  });

  it('Should ask for microphone access when unmute has no stream', async () => {
    stubDeniedMicrophone();
    const harness = buildHarness({ seated: true, flags: { voice: true } });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: en.game.unmuteSelf }));
    await waitFor(() => {
      expect(screen.getByText(en.game.micAccess.blocked)).toBeTruthy();
    });
  });

  it('Should show a speaker-off badge when this player muted another seat', () => {
    stubDeniedMicrophone();
    const harness = buildHarness({ seated: true, flags: { voice: true } });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    const cal = screen.getByRole('button', { name: /Cal/ });
    expect(cal.getAttribute('data-mic')).toBe('off');
    expect(cal.getAttribute('data-local-mute')).toBeNull();

    harness.socket.emit({
      type: 'voice:peer',
      playerId: 'cal',
      producerId: 'prod-cal',
      muted: false,
    });
    expect(cal.getAttribute('data-mic')).toBe('live');

    fireEvent.click(cal);
    fireEvent.click(
      screen.getByRole('button', {
        name: en.game.mutePlayer.replace('{name}', 'Cal'),
      }),
    );
    expect(cal.getAttribute('data-local-mute')).toBe('true');
    expect(cal.getAttribute('data-mic')).toBe('live');
  });

  it('Should pulse another seat when that player is speaking', () => {
    stubDeniedMicrophone();
    const harness = buildHarness({ seated: true, flags: { voice: true } });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    const cal = screen.getByRole('button', { name: /Cal/ });
    expect(cal.getAttribute('data-speaking')).toBeNull();
    harness.socket.emit({ type: 'voice:speaking', playerId: 'cal', speaking: true });
    expect(cal.getAttribute('data-speaking')).toBe('true');
  });

  it('Should confirm a kick from the seat menu when voice and gameKick are on', () => {
    stubDeniedMicrophone();
    const harness = buildHarness({ seated: true, flags: { voice: true, gameKick: true } });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    fireEvent.click(screen.getByRole('button', { name: en.game.playerMenu.report }));
    expect(screen.getByText(/Ask the table to remove/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.game.kickVote.request }));
    expect(harness.socket.lastSent('kick:request')).toEqual({
      type: 'kick:request',
      playerId: 'cal',
    });
  });

  it('Should omit report from the seat menu when gameKick is off', () => {
    stubDeniedMicrophone();
    const harness = buildHarness({ seated: true, flags: { voice: true } });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(screen.queryByRole('button', { name: en.game.playerMenu.report })).toBeNull();
  });

  it('Should omit report from the seat menu after the player has already asked once', () => {
    stubDeniedMicrophone();
    const harness = buildHarness({ seated: true, flags: { voice: true, gameKick: true } });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      you: { ...view.you, canRequestKick: false },
    });

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(screen.queryByRole('button', { name: en.game.playerMenu.report })).toBeNull();
    expect(
      screen.getByRole('button', {
        name: en.game.mutePlayer.replace('{name}', 'Cal'),
      }),
    ).toBeTruthy();
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

  it('Should keep the enacted well empty until the card finishes flying', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('reduceMotion', true);
    harness.services.settings.set('raviVoice', false);
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState(view);
    expect(document.querySelector('[data-policy-party="fascist"][data-filled]')).toBeNull();

    harness.pushState({
      ...view,
      board: {
        ...view.board,
        fascistPolicies: 1,
        lastEnacted: ['fascist'],
      },
    });

    expect(document.querySelector('[data-policy-party="fascist"][data-filled]')).toBeNull();

    await waitFor(() => {
      expect(document.querySelector('[data-policy-party="fascist"][data-filled]')).toBeTruthy();
    });
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
    expect(screen.queryByText(en.game.startNomination)).toBeNull();
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

describe('GameScreen — table kick vote', () => {
  it('Should ask to confirm before requesting a kick', () => {
    const harness = buildHarness({ seated: true, flags: { gameKick: true } });
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(screen.getByText(/Ask the table to remove/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.game.kickVote.request }));
    expect(harness.socket.lastSent('kick:request')).toEqual({
      type: 'kick:request',
      playerId: 'cal',
    });
  });

  it('Should hide the kick request after the player has already asked once', () => {
    const harness = buildHarness({ seated: true, flags: { gameKick: true } });
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      you: { ...view.you, canRequestKick: false },
    });

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(screen.queryByText(/Ask the table to remove/)).toBeNull();
    expect(harness.socket.lastSent('kick:request')).toBeUndefined();
  });

  it('Should play a stamp when a seat is tapped for a kick', () => {
    const harness = buildHarness({ seated: true, flags: { gameKick: true } });
    const play = rs.spyOn(harness.services.sound, 'play');
    renderWithApp(() => <GameScreen />, harness);
    harness.pushState(votingView());
    play.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Cal/ }));
    expect(play).toHaveBeenCalledWith('player-ready');
  });

  it('Should send a kick ballot from the table overlay', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const now = Date.now();
    harness.pushState({
      ...votingView(),
      kickVote: {
        requesterId: 'pres',
        targetId: 'cal',
        startedAt: now,
        endsAt: now + 30_000,
        votedCount: 1,
        voterCount: 2,
        needed: 2,
        yourVote: null,
        votedIds: ['pres'],
      },
    });

    expect(screen.getByText(en.game.kickVote.title)).toBeTruthy();
    expect(
      screen.getByText(
        en.game.kickVote.prompt
          .replace('{requester}', isolateBidi('Ana'))
          .replace('{target}', isolateBidi('Cal'))
          .replace('{requesterSeat}', '1')
          .replace('{targetSeat}', '3'),
      ),
    ).toBeTruthy();
    const dialog = screen.getByRole('dialog', { name: en.game.kickVote.title });
    fireEvent.click(within(dialog).getByRole('button', { name: en.game.voteJa }));
    expect(harness.socket.lastSent('kick:vote')).toEqual({
      type: 'kick:vote',
      agree: true,
    });
  });

  it('Should name both seats when the kick vote is aimed at you', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <GameScreen />, harness);
    const now = Date.now();
    harness.pushState({
      ...votingView(),
      kickVote: {
        requesterId: 'pres',
        targetId: 'you',
        startedAt: now,
        endsAt: now + 30_000,
        votedCount: 1,
        voterCount: 2,
        needed: 2,
        yourVote: null,
        votedIds: ['pres'],
      },
    });

    expect(
      screen.getByText(
        en.game.kickVote.promptYou
          .replace('{requester}', isolateBidi('Ana'))
          .replace('{requesterSeat}', '1')
          .replace('{targetSeat}', '2'),
      ),
    ).toBeTruthy();
  });

  it('Should play a ballot tap on a kick vote', () => {
    const harness = buildHarness({ seated: true });
    const play = rs.spyOn(harness.services.sound, 'play');
    renderWithApp(() => <GameScreen />, harness);
    const now = Date.now();
    harness.pushState({
      ...votingView(),
      kickVote: {
        requesterId: 'pres',
        targetId: 'cal',
        startedAt: now,
        endsAt: now + 30_000,
        votedCount: 1,
        voterCount: 2,
        needed: 2,
        yourVote: null,
        votedIds: ['pres'],
      },
    });
    play.mockClear();

    const dialog = screen.getByRole('dialog', { name: en.game.kickVote.title });
    fireEvent.click(within(dialog).getByRole('button', { name: en.game.voteJa }));
    expect(play).toHaveBeenCalledWith('ballot-tap');
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

  it('Should send continue and leave from the game-over overlay', () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    renderWithApp(() => <GameScreen />, harness);
    const view = votingView();
    harness.pushState({
      ...view,
      phase: Phase.GameOver,
      winner: 'liberal',
      players: view.players.map((player) => ({
        ...player,
        role: 'liberal',
      })),
    });

    fireEvent.click(screen.getByRole('button', { name: en.game.over.stay }));
    expect(harness.socket.lastSent('game:continue')).toEqual({ type: 'game:continue' });
    fireEvent.click(screen.getByRole('button', { name: en.game.leaveRoom }));
    expect(harness.socket.lastSent('room:leave')).toEqual({ type: 'room:leave' });
  });
});
