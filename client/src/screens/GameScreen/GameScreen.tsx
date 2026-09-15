import { For, Show, createEffect, createRenderEffect, createSignal, onCleanup, onMount } from 'solid-js';
import {
  Phase,
  type Policy,
  type PublicPlayer,
  type Vote,
} from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { ERROR_MESSAGE_KEYS } from '../../i18n';
import { isolateBidi } from '../../i18n/utils';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { DialogDragHandle } from '../../components/DialogDragHandle/DialogDragHandle';
import { useDialogDrag } from '../../components/DialogDragHandle/useDialogDrag';
import { Screen } from '../../components/Screen/Screen';
import { Toast } from '../../components/Toast/Toast';
import { GameEventHeader, governmentLabel } from './GameEventHeader';
import { DeckStrip } from './DeckStrip';
import { TableSeat } from './TableSeat';
import { ChatPanel } from './ChatPanel';
import { PolicyBoard } from './PolicyBoard';
import { PlayersModal } from './PlayersModal';
import { PlayerActionsMenu } from './PlayerActionsMenu';
import { GameMenu } from './GameMenu';
import { LegislativeModal } from './LegislativeModal';
import { VotingOverlay } from './VotingOverlay';
import { KickVoteOverlay } from './KickVoteOverlay';
import { PowerPanel } from './PowerPanel';
import { GameOverOverlay } from './GameOverOverlay';
import { PolicyRevealOverlay } from './PolicyRevealOverlay';
import { CEREMONY_MS, NightOverlay } from './NightOverlay';
import { RoleInspectOverlay } from './RoleInspectOverlay';
import { ChancellorReveal } from './ChancellorReveal';
import { InvestigateOverlay } from './InvestigateOverlay';
import { PeekOverlay } from './PeekOverlay';
import { YouDiedOverlay } from './YouDiedOverlay';
import { RaviNarrator } from './RaviNarrator';
import { tableSeatOrder } from './tableSeats';
import { emptyWell, flyToTarget } from './cardFlight';
import styles from './GameScreen.module.scss';

/**
 * Main game screen. A parchment header with the current instruction, a deck
 * strip, compact policy boards at the top, two rows of seats below, and a
 * docked chat panel. Phase actions still arrive as overlays; state is the server's.
 */
export function GameScreen() {
  const { nav, game, i18n, animation, ravi, sound, flags, voice } = useApp();
  const { formatMessage } = i18n;

  const view = game.view;
  const [confirmingLeave, setConfirmingLeave] = createSignal(false);
  const [reporting, setReporting] = createSignal<PublicPlayer | null>(null);
  const [playerMenu, setPlayerMenu] = createSignal<PublicPlayer | null>(null);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [playersOpen, setPlayersOpen] = createSignal(false);
  const [chatHeight, setChatHeight] = createSignal(280);
  const [inspectingRole, setInspectingRole] = createSignal(false);
  const [now, setNow] = createSignal(Date.now());
  const clockMs = () => view()?.kickVote?.startedAt ?? now();
  const [drawHold, setDrawHold] = createSignal(0);
  const vetoDrag = useDialogDrag();
  let seenDrawCount = -1;
  let seenDrawPhase: Phase | null = null;

  let boardElement: HTMLElement | undefined;

  const CEREMONY_GRACE_MS = CEREMONY_MS + 2_000;
  const [ceremonyOpen, setCeremonyOpen] = createSignal(false);
  const [hideRevealedVotes, setHideRevealedVotes] = createSignal(false);
  let ceremonyRoomId: string | null = null;
  let ceremonyDecided = false;

  // Session dropped (left / expired) → back to the play menu.
  createEffect(() => {
    if (!game.inRoom()) nav.returnTo('play');
  });

  // After a win, Continue returns this room to lobby — sit there for another game.
  createEffect(() => {
    const state = view();
    if (!state || !game.inRoom()) return;
    if (state.phase === Phase.Lobby) nav.returnTo('waiting-room');
  });

  const VOTE_REVEAL_HOLD_MS = 5_000;
  createEffect(() => {
    const revealed = view()?.players.some((player) => player.vote != null) === true;
    if (!revealed) {
      setHideRevealedVotes(false);
      return;
    }
    setHideRevealedVotes(false);
    const timer = window.setTimeout(() => setHideRevealedVotes(true), VOTE_REVEAL_HOLD_MS);
    onCleanup(() => window.clearTimeout(timer));
  });

  onMount(() => {
    const handleBack = () => {
      if (playerMenu()) {
        setPlayerMenu(null);
        return;
      }
      if (voice.needsMicAccess()) {
        voice.dismissMicAccess();
        return;
      }
      if (menuOpen()) {
        setMenuOpen(false);
        return;
      }
      if (playersOpen()) {
        setPlayersOpen(false);
        return;
      }
      setConfirmingLeave((open) => !open);
    };
    nav.setBackHandler(handleBack);
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => {
      nav.clearBackHandler(handleBack);
      clearInterval(ticker);
    });
  });

  // Hold the draw-pile count at its pre-deal value, then tick down as each
  // card lifts off — the server already subtracted all three.
  createRenderEffect(() => {
    const state = view();
    if (!state) {
      seenDrawCount = -1;
      seenDrawPhase = null;
      return;
    }
    const draw = state.board.drawPile;
    const enteringPresident =
      state.phase === Phase.PresidentLegislative &&
      seenDrawPhase !== Phase.PresidentLegislative;
    if (enteringPresident && seenDrawCount >= 0 && seenDrawCount - draw === 3) {
      setDrawHold(3);
    }
    if (state.phase !== Phase.PresidentLegislative && drawHold() !== 0) {
      setDrawHold(0);
    }
    seenDrawCount = draw;
    seenDrawPhase = state.phase;
  });

  createEffect(() => {
    const state = view();
    if (!state) return;
    if (state.roomId !== ceremonyRoomId) {
      ceremonyRoomId = state.roomId;
      ceremonyDecided = false;
      setCeremonyOpen(false);
    }
    if (ceremonyDecided) return;
    now();
    const role = game.role() ?? state.you.role;
    const start = state.discussionDeadline?.startedAt ?? 0;
    const looksLikeStart =
      state.phase === Phase.Nomination &&
      start > 0 &&
      now() - start < CEREMONY_GRACE_MS &&
      state.board.liberalPolicies === 0 &&
      state.board.fascistPolicies === 0 &&
      state.board.electionTracker === 0;
    if (looksLikeStart && !role) return;
    ceremonyDecided = true;
    if (looksLikeStart && role) setCeremonyOpen(true);
  });

  const [toast, setToast] = createSignal<{
    title?: string;
    message: string;
    variant: 'prominent' | 'subtle';
  } | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  function showToast(next: NonNullable<ReturnType<typeof toast>>): void {
    clearTimeout(toastTimer);
    setToast(next);
    toastTimer = setTimeout(
      () => setToast(null),
      next.variant === 'prominent' ? 4200 : 2600,
    );
  }
  onCleanup(() => clearTimeout(toastTimer));

  // --- Policy enactment reveal ----------------------------------------------
  // The server broadcasts full state, so an enactment is detected as a diff:
  // the policy total grew within the same room. (lastEnacted caps at 5 entries,
  // so its length is not a reliable counter.)
  const [revealedPolicy, setRevealedPolicy] = createSignal<Policy | null>(null);
  // Server counts update immediately; the well stays empty until the card lands.
  const [shownLiberal, setShownLiberal] = createSignal(0);
  const [shownFascist, setShownFascist] = createSignal(0);
  const CHANCELLOR_REVEAL_MS = 5_000;
  const [chancellorReveal, setChancellorReveal] = createSignal(false);
  let lastPhaseForReveal: string | null = null;
  let revealTimer: ReturnType<typeof setTimeout> | undefined;
  const [loyaltyCheck, setLoyaltyCheck] = createSignal<{
    targetId: string;
    targetName: string;
  } | null>(null);
  let seenInvestigateLog = 0;
  let sawInvestigateBaseline = false;
  const [killedOpen, setKilledOpen] = createSignal(false);
  let sawYouAlive = false;
  const [showRoles, setShowRoles] = createSignal(false);
  let lastPhaseForRoles: string | null = null;
  let revealCard: HTMLDivElement | undefined;
  let seenPolicyTotal: number | null = null;
  let seenElectionTracker: number | null = null;
  let seenRoomId: string | null = null;

  createEffect(() => {
    const state = view();
    if (!state) {
      seenPolicyTotal = null;
      seenElectionTracker = null;
      seenRoomId = null;
      setShownLiberal(0);
      setShownFascist(0);
      return;
    }
    const total = state.board.liberalPolicies + state.board.fascistPolicies;
    const tracker = state.board.electionTracker;
    if (state.roomId !== seenRoomId) {
      // First snapshot of a room (join/rejoin) — baseline, don't replay history.
      seenRoomId = state.roomId;
      seenPolicyTotal = total;
      seenElectionTracker = tracker;
      setShownLiberal(state.board.liberalPolicies);
      setShownFascist(state.board.fascistPolicies);
      return;
    }
    const previousTotal = seenPolicyTotal ?? total;
    const previousTracker = seenElectionTracker ?? tracker;
    seenPolicyTotal = total;
    seenElectionTracker = tracker;
    const latest = state.board.lastEnacted[state.board.lastEnacted.length - 1];
    if (total > previousTotal && latest) {
      revealEnactedPolicy(latest);
      void ravi.speak(latest === 'liberal' ? 'law.liberal' : 'law.fascist');
      sound.play(latest === 'liberal' ? 'law-liberal' : 'law-fascist');
    }
    // A failed government jolts the board (a reset to 0 is chaos, not a failure).
    if (tracker > previousTracker) {
      void animation.play(boardElement, 'shake');
    }
  });

  createEffect(() => {
    const state = view();
    if (!state) {
      lastPhaseForReveal = null;
      return;
    }
    const previous = lastPhaseForReveal;
    lastPhaseForReveal = state.phase;
    if (
      previous === Phase.Nomination &&
      state.phase === Phase.Voting &&
      state.board.chancellor
    ) {
      setChancellorReveal(true);
      clearTimeout(revealTimer);
      revealTimer = setTimeout(() => setChancellorReveal(false), CHANCELLOR_REVEAL_MS);
    }
    if (state.phase !== Phase.Voting) {
      clearTimeout(revealTimer);
      setChancellorReveal(false);
    }
  });
  onCleanup(() => clearTimeout(revealTimer));

  createEffect(() => {
    const state = view();
    const entries = game.logEntries();
    if (!state) return;
    if (!sawInvestigateBaseline) {
      seenInvestigateLog = entries.length;
      sawInvestigateBaseline = true;
      return;
    }
    if (entries.length <= seenInvestigateLog) return;
    for (const entry of entries.slice(seenInvestigateLog)) {
      if (entry.code !== 'investigated') continue;
      const name = String(entry.params?.name ?? '');
      const target = state.players.find((player) => player.name === name);
      if (!target) continue;
      const iAmThePresident = state.board.president === state.you.id;
      // The public log is broadcast before the President's private snapshot.
      // Wait for the party so the overlay doesn't treat the President as a spectator.
      if (iAmThePresident && state.you.investigation?.party == null) return;
      setLoyaltyCheck({
        targetId: target.id,
        targetName: name,
      });
    }
    seenInvestigateLog = entries.length;
  });

  createEffect(() => {
    const state = view();
    if (!state) return;
    const me = state.players.find((player) => player.id === state.you.id);
    if (!me) return;
    if (me.isAlive) {
      sawYouAlive = true;
      return;
    }
    if (sawYouAlive) {
      setKilledOpen(true);
      sawYouAlive = false;
    }
  });

  createEffect(() => {
    if (ravi.lineId() === 'game.reveal') setShowRoles(true);
  });

  let lastClockSecond = -1;
  createEffect(() => {
    const state = view();
    now();
    if (!state) {
      lastClockSecond = -1;
      return;
    }
    const endsAt = [
      state.discussionDeadline?.endsAt,
      state.nominationDeadline?.endsAt,
      state.voteDeadline?.endsAt,
      state.legislativeDeadline?.endsAt,
    ].filter((value): value is number => value != null && value > 0);
    if (endsAt.length === 0 || state.kickVote) {
      lastClockSecond = -1;
      return;
    }
    const seconds = Math.max(0, Math.ceil((Math.min(...endsAt) - clockMs()) / 1000));
    if (seconds <= 0 || seconds > 10) {
      lastClockSecond = -1;
      return;
    }
    if (seconds === lastClockSecond) return;
    lastClockSecond = seconds;
    sound.play(seconds <= 3 ? 'timer-urgent' : 'timer-tick');
  });

  createEffect(() => {
    const state = view();
    if (!state) return;
    const previous = lastPhaseForRoles;
    lastPhaseForRoles = state.phase;
    if (state.phase !== Phase.GameOver) {
      setShowRoles(false);
      return;
    }
    if (previous == null) setShowRoles(true);
  });

  function revealEnactedPolicy(policy: Policy): void {
    void animation.enqueue(async () => {
      setRevealedPolicy(policy);
      await animation.play(revealCard, 'policy-reveal');
      await animation.hold(700);
      await flyToTarget(animation, revealCard, emptyWell(policy), {
        landScale: 0.46,
        duration: 620,
      });
      setRevealedPolicy(null);
      if (policy === 'liberal') setShownLiberal((count) => count + 1);
      else setShownFascist((count) => count + 1);
    });
  }

  const iAmPresident = () => {
    const state = view();
    return state != null && state.board.president === state.you.id;
  };

  const canNominate = (player: PublicPlayer) => {
    const state = view();
    return (
      inNomination() &&
      !state?.kickVote &&
      iAmPresident() &&
      player.isAlive &&
      player.connected &&
      player.id !== state!.you.id &&
      !state!.ineligibleChancellors.includes(player.id)
    );
  };

  const termLocked = (player: PublicPlayer) => {
    const state = view();
    return (
      inNomination() &&
      iAmPresident() &&
      player.isAlive &&
      player.id !== state!.you.id &&
      state!.ineligibleChancellors.includes(player.id)
    );
  };

  const awayFromTable = (player: PublicPlayer) => {
    const state = view();
    return (
      inNomination() &&
      iAmPresident() &&
      player.isAlive &&
      !player.connected &&
      player.id !== state!.you.id
    );
  };

  const canPowerTarget = (player: PublicPlayer) => {
    const state = view();
    if (!state || state.kickVote || state.phase !== Phase.SpecialPower || !iAmPresident()) {
      return false;
    }
    if (!player.isAlive || player.id === state.you.id) return false;
    const power = state.activePower;
    if (power === 'investigate') {
      return state.you.investigation == null && player.party == null;
    }
    if (power === 'specialElection') return player.connected;
    return power === 'execution';
  };

  const alreadyInvestigated = (player: PublicPlayer) => {
    const state = view();
    return (
      state != null &&
      state.phase === Phase.SpecialPower &&
      state.activePower === 'investigate' &&
      iAmPresident() &&
      state.you.investigation == null &&
      player.party != null &&
      player.id !== state.you.id
    );
  };

  const seatSelectable = (player: PublicPlayer) =>
    canNominate(player) || canPowerTarget(player);

  const canReport = (player: PublicPlayer) => {
    const state = view();
    const you = game.you();
    if (!state || !you?.isAlive) return false;
    if (!state.you.canRequestKick) return false;
    if (state.phase === Phase.Lobby || state.phase === Phase.GameOver) return false;
    if (state.kickVote || ceremonyOpen()) return false;
    return player.isAlive && player.id !== state.you.id;
  };

  const canMuteOther = (player: PublicPlayer) => {
    const state = view();
    return flags.enabled('voice') && state != null && player.id !== state.you.id;
  };

  const canOpenPlayerMenu = (player: PublicPlayer) =>
    canReport(player) || canMuteOther(player);

  function nominate(player: PublicPlayer): void {
    game.sendCommand({ kind: 'nominateChancellor', targetId: player.id });
    setPlayersOpen(false);
  }

  const voters = () =>
    view()?.players.filter((player) => player.isAlive && player.connected) ?? [];
  const votedCount = () => voters().filter((player) => player.hasVoted).length;
  const voteSecondsLeft = () => {
    const deadline = view()?.voteDeadline;
    return deadline ? Math.max(0, Math.ceil((deadline.endsAt - clockMs()) / 1000)) : 0;
  };

  const secondsUntil = (endsAt: number) =>
    Math.max(0, Math.ceil((endsAt - clockMs()) / 1000));

  function castVote(vote: 'ja' | 'nein'): void {
    game.sendCommand({ kind: 'castVote', vote });
  }

  // During discussion the President's endTurn opens nomination; in the
  // nomination window it ends the round (the engine decides which by state).
  function sendEndTurn(): void {
    game.sendCommand({ kind: 'endTurn' });
  }

  const inNomination = () =>
    view()?.phase === Phase.Nomination && view()?.nominationDeadline != null;

  const isLegislative = () => {
    const phase = view()?.phase;
    return (
      phase === Phase.PresidentLegislative ||
      phase === Phase.ChancellorLegislative
    );
  };
  const myPolicies = () => view()?.you.policies ?? [];
  const legislativeSecondsLeft = () => {
    const deadline = view()?.legislativeDeadline;
    if (!deadline) return 0;
    if (now() < deadline.startedAt) return 0;
    return Math.max(0, Math.ceil((deadline.endsAt - clockMs()) / 1000));
  };

  function chooseLegislative(index: number): void {
    const phase = view()?.phase;
    if (phase === Phase.PresidentLegislative) {
      game.sendCommand({ kind: 'discardPolicy', index });
    } else if (phase === Phase.ChancellorLegislative) {
      game.sendCommand({ kind: 'enactPolicy', index });
    }
  }

  const iAmChancellor = () => {
    const state = view();
    return state != null && state.board.chancellor === state.you.id;
  };
  const proposeVeto = () => game.sendCommand({ kind: 'vetoRequest' });
  const respondVeto = (agree: boolean) =>
    game.sendCommand({ kind: 'vetoConsent', agree });
  const usePower = (targetId: string) =>
    game.sendCommand({ kind: 'useSpecialPower', targetId });

  type TableOverlay =
    | 'killed'
    | 'leave'
    | 'over'
    | 'menu'
    | 'players'
    | 'chancellorReveal'
    | 'investigate'
    | 'vote'
    | 'veto'
    | 'legislative'
    | 'power'
    | 'night';

  /**
   * One table overlay at a time. A new phase modal replaces leftovers
   * (night, policy reveal); opening menu/players/leave replaces whatever
   * was showing.
   */
  function tableOverlay(): TableOverlay | null {
    if (killedOpen()) return 'killed';
    if (confirmingLeave()) return 'leave';
    const state = view();
    if (state?.phase === Phase.GameOver && state.winner) return 'over';
    if (menuOpen()) return 'menu';
    if (playersOpen()) return 'players';
    if (loyaltyCheck()) return 'investigate';
    if (chancellorReveal()) return 'chancellorReveal';
    if (state?.phase === Phase.Voting) return 'vote';
    if (isLegislative() && state?.vetoRequested) return 'veto';
    if (isLegislative()) return 'legislative';
    if (state?.phase === Phase.SpecialPower && state.activePower) return 'power';
    if (ceremonyOpen() && game.role()) return 'night';
    return null;
  }

  createEffect(() => {
    const overlay = tableOverlay();
    const phaseTakesOver =
      overlay === 'vote' ||
      overlay === 'chancellorReveal' ||
      overlay === 'investigate' ||
      overlay === 'veto' ||
      overlay === 'legislative' ||
      overlay === 'power' ||
      overlay === 'over';
    if (!phaseTakesOver) return;
    if (ceremonyOpen()) setCeremonyOpen(false);
  });

  const playerName = (playerId: string | null) =>
    view()?.players.find((player) => player.id === playerId)?.name ?? '—';
  const playerSeat = (playerId: string) => {
    const player = view()?.players.find((player) => player.id === playerId);
    return player != null ? player.seat + 1 : 0;
  };

  const seatedPlayers = () => {
    const state = view();
    return tableSeatOrder(state?.players ?? [], state?.you.id ?? '');
  };

  const checkedParty = () => {
    const state = view();
    const check = loyaltyCheck();
    if (!state || !check) return null;
    if (state.you.investigation?.party) return state.you.investigation.party;
    if (state.you.id !== check.targetId) return null;
    const role = game.role() ?? state.you.role;
    if (!role) return null;
    return role === 'liberal' ? 'liberal' : 'fascist';
  };

  const nextPresidentId = () => {
    const seated = [...(view()?.players ?? [])].sort((a, b) => a.seat - b.seat);
    const playable = seated.filter(
      (player) => player.isAlive && player.connected,
    );
    const presidentId = view()?.board.president;
    if (playable.length === 0) return null;
    const start = seated.findIndex((player) => player.id === presidentId);
    const from = start < 0 ? 0 : start;
    for (let step = 1; step <= seated.length; step++) {
      const candidate = seated[(from + step) % seated.length];
      if (candidate.isAlive && candidate.connected) return candidate.id;
    }
    return playable[0].id;
  };

  const BUBBLE_MS = 8_000;
  const bubbleFor = (playerId: string) => {
    if (ceremonyOpen()) return undefined;
    const messages = game.chatMessages();
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].playerId !== playerId) continue;
      return now() - messages[i].at < BUBBLE_MS ? messages[i].text : undefined;
    }
    return undefined;
  };

  function helpMessage(): string {
    const state = view();
    if (!state) return formatMessage('game.help.elect');
    if (state.kickVote) {
      return formatMessage('game.kickVote.help', {
        name: isolateBidi(playerName(state.kickVote.targetId)),
      });
    }
    if (state.phase === Phase.GameOver && state.winner) {
      return formatMessage(
        state.winner === 'liberal'
          ? 'game.over.liberalsWin'
          : 'game.over.fascistsWin',
      );
    }
    if (game.inDiscussion()) return formatMessage('game.discussionOpen');
    if (inNomination()) {
      return iAmPresident()
        ? formatMessage('game.nominateHint')
        : formatMessage('game.nominateWaiting', {
            name: isolateBidi(playerName(state.board.president)),
          });
    }
    if (state.phase === Phase.Voting) {
      return formatMessage(
        iAmChancellor() ? 'game.help.voteYou' : 'game.help.vote',
      );
    }
    if (state.phase === Phase.PresidentLegislative) {
      if (myPolicies().length) return formatMessage('game.presidentDiscardHint');
      return iAmPresident()
        ? formatMessage('game.presidentChoosingYou')
        : formatMessage('game.presidentChoosing', {
            name: isolateBidi(playerName(state.board.president)),
          });
    }
    if (state.phase === Phase.ChancellorLegislative) {
      if (myPolicies().length) return formatMessage('game.chancellorEnactHint');
      return iAmChancellor()
        ? formatMessage('game.chancellorChoosingYou')
        : formatMessage('game.chancellorChoosing', {
            name: isolateBidi(playerName(state.board.chancellor)),
          });
    }
    if (state.phase === Phase.SpecialPower && state.activePower) {
      if (iAmPresident()) {
        const hint = {
          investigate: 'game.power.investigateHint',
          execution: 'game.power.executeHint',
          specialElection: 'game.power.electHint',
          policyPeek: 'game.power.peekHint',
        } as const;
        return formatMessage(hint[state.activePower]);
      }
      return formatMessage('game.power.inProgress', {
        name: isolateBidi(playerName(state.board.president)),
      });
    }
    return formatMessage('game.help.elect');
  }

  function onSeat(player: PublicPlayer): void {
    if (canNominate(player)) {
      sound.play('player-ready');
      nominate(player);
      return;
    }
    if (canPowerTarget(player)) {
      sound.play('player-ready');
      usePower(player.id);
      return;
    }
    if (termLocked(player)) {
      sound.play('ui-error');
      const seat = document.querySelector(`[data-seat-id="${player.id}"]`);
      void animation.play(seat instanceof HTMLElement ? seat : null, 'shake');
      showToast({
        variant: 'prominent',
        message: formatMessage('game.nominateIneligible'),
      });
      return;
    }
    if (alreadyInvestigated(player)) {
      sound.play('ui-error');
      const seat = document.querySelector(`[data-seat-id="${player.id}"]`);
      void animation.play(seat instanceof HTMLElement ? seat : null, 'shake');
      showToast({
        variant: 'prominent',
        message: formatMessage('game.power.alreadyInvestigated'),
      });
      return;
    }
    if (awayFromTable(player)) {
      sound.play('ui-error');
      const seat = document.querySelector(`[data-seat-id="${player.id}"]`);
      void animation.play(seat instanceof HTMLElement ? seat : null, 'shake');
      showToast({
        variant: 'prominent',
        message: formatMessage('game.nominateAbsent'),
      });
      return;
    }
    if (canOpenPlayerMenu(player)) {
      sound.play('player-ready');
      if (flags.enabled('voice')) {
        setPlayerMenu(player);
        return;
      }
      setReporting(player);
    }
  }

  function leaveRoom(): void {
    setConfirmingLeave(false);
    game.leaveRoom();
    nav.returnTo('play');
  }

  function seatBallot(player: PublicPlayer): Vote | 'back' | null {
    if (hideRevealedVotes()) return null;
    if (player.vote != null) return player.vote;
    if (player.hasVoted) return 'back';
    return null;
  }

  return (
    <Screen fill>
      <Show when={view()}>
        {(state) => (
          <div
            class={styles.scene}
            style={{ '--chat-panel-height': `${chatHeight()}px` }}
          >
            <GameEventHeader
              headline={ravi.line() ?? helpMessage()}
              governmentLabel={governmentLabel(
                state().board.liberalPolicies + state().board.fascistPolicies,
                formatMessage,
              )}
              fullWidth={ceremonyOpen()}
            />

            <div class={styles.body}>
            <DeckStrip
              drawCount={state().board.drawPile + drawHold()}
              discardCount={state().board.discardPile}
              electionTracker={state().board.electionTracker}
              role={game.role() ?? state().you.role}
              playerId={state().you.id}
              onInspectRole={() => setInspectingRole(true)}
              formatMessage={formatMessage}
            />

            <div
              class={styles.table}
              data-game-table
              ref={(element) => (boardElement = element)}
            >
              <PolicyBoard
                board={{
                  ...state().board,
                  liberalPolicies: shownLiberal(),
                  fascistPolicies: shownFascist(),
                }}
                formatMessage={formatMessage}
              />

              <div class={styles.players}>
                <div class={styles.seats} role="list">
                  <For each={seatedPlayers()}>
                    {(player) => (
                      <TableSeat
                        player={player}
                        isYou={player.id === state().you.id}
                        isNext={player.id === nextPresidentId()}
                        selectable={seatSelectable(player)}
                        reportable={
                          canOpenPlayerMenu(player) && !seatSelectable(player)
                        }
                        termLocked={
                          termLocked(player) ||
                          awayFromTable(player) ||
                          alreadyInvestigated(player)
                        }
                        showPublicMarks={!ceremonyOpen()}
                        bubble={bubbleFor(player.id)}
                        ballot={seatBallot(player)}
                        onSelect={() => onSeat(player)}
                        formatMessage={formatMessage}
                      />
                    )}
                  </For>
                </div>
              </div>

            <Show when={tableOverlay() === 'vote'}>
              <VotingOverlay
                formatMessage={formatMessage}
                prompt={formatMessage(
                  iAmChancellor() ? 'game.votePromptYou' : 'game.votePrompt',
                  {
                    name: isolateBidi(playerName(state().board.chancellor)),
                  },
                )}
                canVote={state().you.vote == null && !!game.you()?.isAlive}
                yourVote={state().you.vote}
                votedCount={votedCount()}
                totalVoters={voters().length}
                youId={state().you.id}
                showTimer
                secondsLeft={voteSecondsLeft()}
                startedAt={state().voteDeadline?.startedAt ?? Date.now()}
                endsAt={state().voteDeadline?.endsAt ?? Date.now()}
                onVote={castVote}
              />
            </Show>

            <Show when={state().kickVote}>
              {(vote) => (
                <KickVoteOverlay
                  formatMessage={formatMessage}
                  prompt={formatMessage(
                    vote().targetId === state().you.id
                      ? 'game.kickVote.promptYou'
                      : vote().requesterId === state().you.id
                        ? 'game.kickVote.promptYours'
                        : 'game.kickVote.prompt',
                    {
                      requester: isolateBidi(playerName(vote().requesterId)),
                      target: isolateBidi(playerName(vote().targetId)),
                      requesterSeat: playerSeat(vote().requesterId),
                      targetSeat: playerSeat(vote().targetId),
                    },
                  )}
                  canVote={
                    !!game.you()?.isAlive &&
                    vote().targetId !== state().you.id &&
                    vote().yourVote == null
                  }
                  yourVote={vote().yourVote}
                  votedCount={vote().votedCount}
                  totalVoters={vote().voterCount}
                  secondsLeft={Math.max(
                    0,
                    Math.ceil((vote().endsAt - now()) / 1000),
                  )}
                  startedAt={vote().startedAt}
                  endsAt={vote().endsAt}
                  onVote={(agree) => game.voteKick(agree)}
                />
              )}
            </Show>

            </div>

            <ChatPanel
              talkingAllowed={!ceremonyOpen()}
              actionLabel={
                ceremonyOpen() || !iAmPresident() || state().kickVote
                  ? undefined
                  : game.inDiscussion()
                    ? formatMessage('game.startNomination')
                    : inNomination()
                      ? formatMessage('game.endRound')
                      : undefined
              }
              onAction={
                !ceremonyOpen() &&
                !state().kickVote &&
                iAmPresident() &&
                (game.inDiscussion() || inNomination())
                  ? sendEndTurn
                  : undefined
              }
              onOpenPlayers={() => setPlayersOpen(true)}
              onOpenMenu={() => setMenuOpen(true)}
              onHeightChange={setChatHeight}
            />

            <RaviNarrator
              ceremonyOpen={ceremonyOpen()}
              now={clockMs()}
              chancellorReveal={chancellorReveal()}
            />

            <Show when={tableOverlay() === 'night' && game.role()}>
              {(role) => (
                <NightOverlay
                  role={role()}
                  playerCount={state().players.length}
                  players={seatedPlayers()}
                  youId={state().you.id}
                  teammates={[...state().players]
                    .filter(
                      (player) =>
                        player.role != null && player.id !== state().you.id,
                    )
                    .sort((a, b) => a.seat - b.seat)}
                  presidentName={isolateBidi(playerName(state().board.president))}
                  presidentIsYou={iAmPresident()}
                  startedAt={state().discussionDeadline?.startedAt ?? Date.now()}
                  onDone={() => {
                    setCeremonyOpen(false);
                    void ravi.speak('discuss.start');
                  }}
                />
              )}
            </Show>

            <Show when={inspectingRole() && (game.role() ?? state().you.role)}>
              {(role) => (
                <RoleInspectOverlay
                  role={role()}
                  playerId={state().you.id}
                  onClose={() => setInspectingRole(false)}
                />
              )}
            </Show>

            <Show when={revealedPolicy()}>
              {(policy) => (
                <PolicyRevealOverlay
                  policy={policy()}
                  label={formatMessage(`policyReveal.${policy()}`)}
                  cardRef={(element) => (revealCard = element)}
                />
              )}
            </Show>

            <Show when={tableOverlay() === 'chancellorReveal'}>
              <ChancellorReveal
                formatMessage={formatMessage}
                isYou={iAmChancellor()}
                chancellorName={isolateBidi(playerName(state().board.chancellor))}
                chancellorAvatar={
                  state().players.find((player) => player.id === state().board.chancellor)
                    ?.avatar ?? 0
                }
              />
            </Show>

            <Show when={tableOverlay() === 'investigate' && loyaltyCheck()}>
              {(check) => (
                <InvestigateOverlay
                  targetId={check().targetId}
                  targetName={isolateBidi(check().targetName)}
                  party={checkedParty()}
                  announce={view()?.you.investigation != null}
                  formatMessage={formatMessage}
                  onContinue={() => {
                    const hadPrivate = view()?.you.investigation != null;
                    setLoyaltyCheck(null);
                    if (hadPrivate) usePower('');
                  }}
                />
              )}
            </Show>

            <Show when={tableOverlay() === 'veto'}>
              <div class={styles.overlayLayer}>
                <div class={styles.voteShift} style={vetoDrag.style()}>
                <div class={styles.votePanel} {...vetoDrag.surfaceProps}>
                  <DialogDragHandle
                    label={formatMessage('game.moveDialog')}
                    dragging={vetoDrag.dragging()}
                    handleProps={vetoDrag.handleProps}
                  />
                  <span class={styles.votePrompt}>
                    {formatMessage(
                      iAmChancellor()
                        ? 'game.veto.consentPromptYou'
                        : 'game.veto.consentPrompt',
                    )}
                  </span>
                  <Show
                    when={iAmPresident()}
                    fallback={
                      <span class={styles.voteWaiting}>
                        {formatMessage('game.veto.waiting')}
                      </span>
                    }
                  >
                    <div class={styles.voteButtons}>
                      <button
                        type="button"
                        class={styles.voteJa}
                        onClick={() => respondVeto(true)}
                      >
                        {formatMessage('game.veto.agree')}
                      </button>
                      <button
                        type="button"
                        class={styles.voteNein}
                        onClick={() => respondVeto(false)}
                      >
                        {formatMessage('game.veto.reject')}
                      </button>
                    </div>
                  </Show>
                </div>
                </div>
              </div>
            </Show>

            <Show when={tableOverlay() === 'legislative'}>
              <LegislativeModal
                mode={
                  state().phase === Phase.PresidentLegislative
                    ? 'discard'
                    : 'enact'
                }
                policies={myPolicies()}
                presidentId={state().board.president ?? ''}
                chancellorId={state().board.chancellor}
                youId={state().you.id}
                presidentName={isolateBidi(playerName(state().board.president))}
                chancellorName={isolateBidi(playerName(state().board.chancellor))}
                secondsLeft={legislativeSecondsLeft()}
                canVeto={
                  state().phase === Phase.ChancellorLegislative &&
                  state().vetoUnlocked &&
                  iAmChancellor()
                }
                startedAt={state().legislativeDeadline?.startedAt ?? 0}
                onDrewCard={() => setDrawHold((held) => Math.max(0, held - 1))}
                onDealCaughtUp={() => setDrawHold(0)}
                onPick={chooseLegislative}
                onVeto={proposeVeto}
                formatMessage={formatMessage}
              />
            </Show>

            <Show when={tableOverlay() === 'power' && state().activePower === 'policyPeek'}>
              <PeekOverlay
                policies={state().you.peek}
                formatMessage={formatMessage}
                onContinue={() => {
                  if (iAmPresident()) usePower('');
                }}
              />
            </Show>

            <Show when={tableOverlay() === 'power' && state().activePower !== 'policyPeek'}>
              <div class={styles.powerDock}>
                <PowerPanel
                  formatMessage={formatMessage}
                  power={state().activePower!}
                  isPresident={iAmPresident()}
                  presidentName={playerName(state().board.president)}
                  investigation={state().you.investigation}
                  onContinue={() => usePower('')}
                />
              </div>
            </Show>

            <Show when={game.lastError()}>
              <p class={styles.error} onClick={() => game.clearError()}>
                {formatMessage(ERROR_MESSAGE_KEYS[game.lastError()!.code])}
              </p>
            </Show>

            <Show when={toast()}>
              {(active) => (
                <Toast
                  title={active().title}
                  message={active().message}
                  variant={active().variant}
                />
              )}
            </Show>

            <PlayersModal
              open={tableOverlay() === 'players'}
              players={state().players}
              youId={state().you.id}
              formatMessage={formatMessage}
              canNominate={(player) => canOpenPlayerMenu(player)}
              showOffice={!ceremonyOpen()}
              onNominate={(player) => {
                sound.play('player-ready');
                if (flags.enabled('voice')) {
                  setPlayerMenu(player);
                  return;
                }
                setPlayersOpen(false);
                setReporting(player);
              }}
              onClose={() => setPlayersOpen(false)}
            />

            <Show when={playerMenu()}>
              {(target) => (
                <PlayerActionsMenu
                  player={target()}
                  canReport={canReport(target())}
                  canMute={canMuteOther(target())}
                  muted={voice.isRemoteMuted(target().id)}
                  formatMessage={formatMessage}
                  onReport={() => {
                    const player = target();
                    setPlayerMenu(null);
                    setReporting(player);
                  }}
                  onMute={() => {
                    voice.toggleRemoteMute(target().id);
                    setPlayerMenu(null);
                  }}
                  onClose={() => setPlayerMenu(null)}
                />
              )}
            </Show>

            <GameMenu
              open={tableOverlay() === 'menu'}
              roomName={state().name}
              onClose={() => setMenuOpen(false)}
              onViewRules={() => nav.navigate('rules')}
              onLeave={() => {
                setMenuOpen(false);
                setConfirmingLeave(true);
              }}
            />

            <Show when={tableOverlay() === 'killed'}>
              <YouDiedOverlay
                formatMessage={formatMessage}
                onStay={() => setKilledOpen(false)}
                onLeave={leaveRoom}
              />
            </Show>

            <ConfirmDialog
              open={voice.needsMicAccess()}
              message={formatMessage(
                voice.micBlocked()
                  ? 'game.micAccess.blocked'
                  : 'game.micAccess.message',
              )}
              confirmLabel={formatMessage('game.micAccess.allow')}
              cancelLabel={formatMessage('common.cancel')}
              onConfirm={() => void voice.grantMicAccess()}
              onCancel={() => voice.dismissMicAccess()}
            />

            <ConfirmDialog
              open={reporting() != null}
              message={formatMessage('game.kickVote.confirm', {
                name: isolateBidi(reporting()?.name ?? ''),
              })}
              confirmLabel={formatMessage('game.kickVote.request')}
              cancelLabel={formatMessage('common.cancel')}
              onConfirm={() => {
                const target = reporting();
                setReporting(null);
                if (target) game.requestKick(target.id);
              }}
              onCancel={() => setReporting(null)}
            />

            <ConfirmDialog
              open={tableOverlay() === 'leave'}
              message={formatMessage(
                game.isHost() ? 'leaveDialog.hostMessage' : 'leaveDialog.message',
              )}
              confirmLabel={formatMessage('leaveDialog.confirm')}
              cancelLabel={formatMessage('common.cancel')}
              onConfirm={leaveRoom}
              onCancel={() => setConfirmingLeave(false)}
            />

            <Show when={tableOverlay() === 'over'}>
              <GameOverOverlay
                formatMessage={formatMessage}
                winner={state().winner!}
                players={state().players}
                youId={state().you.id}
                showRoles={showRoles()}
                wantsContinue={
                  state().players.find((player) => player.id === state().you.id)
                    ?.wantsContinue === true
                }
                onContinue={() => game.continuePlaying()}
                onLeave={leaveRoom}
              />
            </Show>
            </div>
          </div>
        )}
      </Show>
    </Screen>
  );
}
