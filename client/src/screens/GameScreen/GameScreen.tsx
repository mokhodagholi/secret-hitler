import { For, Show, createEffect, createRenderEffect, createSignal, onCleanup, onMount } from 'solid-js';
import {
  Phase,
  type ExecutivePower,
  type Policy,
  type PublicPlayer,
  type Vote,
} from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { ERROR_MESSAGE_KEYS } from '../../i18n';
import { isolateBidi } from '../../i18n/utils';
import { playerLabel } from '../../i18n/perspective';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { DialogDragHandle } from '../../components/DialogDragHandle/DialogDragHandle';
import { useDialogDrag } from '../../components/DialogDragHandle/useDialogDrag';
import { Screen } from '../../components/Screen/Screen';
import { Toast } from '../../components/Toast/Toast';
import { GameEventHeader } from './GameEventHeader';
import { DeckStrip } from './DeckStrip';
import { TableSeat } from './TableSeat';
import { ChatPanel } from './ChatPanel';
import { PolicyBoard } from './PolicyBoard';
import { PlayersModal } from './PlayersModal';
import { RoundHistoryModal } from './RoundHistoryModal';
import { PlayerActionsMenu } from './PlayerActionsMenu';
import { GameMenu } from './GameMenu';
import { LegislativeModal } from './LegislativeModal';
import { VotingOverlay } from './VotingOverlay';
import { KickVoteOverlay } from './KickVoteOverlay';
import { GameOverOverlay } from './GameOverOverlay';
import { PolicyRevealOverlay } from './PolicyRevealOverlay';
import { CEREMONY_MS, NightOverlay } from './NightOverlay';
import { RoleInspectOverlay } from './RoleInspectOverlay';
import { ChancellorReveal } from './ChancellorReveal';
import { InvestigateOverlay } from './InvestigateOverlay';
import { PeekOverlay } from './PeekOverlay';
import { YouDiedOverlay } from './YouDiedOverlay';
import { VetoBurnOverlay } from './VetoBurnOverlay';
import { SealFlightOverlay } from './SealFlightOverlay';
import { OfficeHandoffOverlay } from './OfficeHandoffOverlay';
import { RaviNarrator } from './RaviNarrator';
import { Spotlight } from './Spotlight';
import { tutorialYou } from '../../tutorial/cast';
import { effectForLookTarget } from '../../tutorial/lookView';
import { tableSeatOrder } from './tableSeats';
import { emptyWell, flyToTarget, offsetFrom, pileEl } from './cardFlight';
import { commitOnPress } from './commitOnPress';
import styles from './GameScreen.module.scss';

/**
 * Main game screen. A parchment header with the current instruction, a deck
 * strip, compact policy boards at the top, two rows of seats below, and a
 * docked chat panel. Phase actions still arrive as overlays; state is the server's.
 */
export function GameScreen() {
  const { nav, game, i18n, animation, ravi, sound, flags, voice, tutorial, settings } =
    useApp();
  const { formatMessage } = i18n;

  const view = () => {
    if (tutorial.looking()) return tutorial.lookView();
    if (tutorial.playing()) return tutorial.playView();
    return game.view();
  };
  const onboarding = () => tutorial.active();

  createEffect(() => {
    if (!tutorial.looking()) return;
    const effect = effectForLookTarget(tutorial.target());
    if (effect) sound.play(effect);
  });

  const [confirmingLeave, setConfirmingLeave] = createSignal(false);
  const [reporting, setReporting] = createSignal<PublicPlayer | null>(null);
  const [playerMenu, setPlayerMenu] = createSignal<PublicPlayer | null>(null);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [playersOpen, setPlayersOpen] = createSignal(false);
  const [historyOpen, setHistoryOpen] = createSignal(false);
  const [chatHeight, setChatHeight] = createSignal(280);
  const [inspectingRole, setInspectingRole] = createSignal(false);
  const [lookHeadlineTyped, setLookHeadlineTyped] = createSignal<{
    text: string;
    done: boolean;
  }>({ text: '', done: false });
  const lookHeadlineText = () => formatMessage(tutorial.headlineKey());
  const lookHeadlineReady = () =>
    tutorial.lookBlurred() ||
    (lookHeadlineTyped().done && lookHeadlineTyped().text === lookHeadlineText());
  const [now, setNow] = createSignal(Date.now());
  const clockMs = () => view()?.kickVote?.startedAt ?? now();
  const [drawHold, setDrawHold] = createSignal(0);
  const [actionCommitted, setActionCommitted] = createSignal(false);
  const vetoDrag = useDialogDrag();
  let seenDrawCount = -1;
  let seenDrawPhase: Phase | null = null;

  let boardElement: HTMLElement | undefined;

  const CEREMONY_GRACE_MS = CEREMONY_MS + 2_000;
  const [ceremonyOpen, setCeremonyOpen] = createSignal(false);
  const [hideBallots, setHideBallots] = createSignal(false);
  const [heldBallots, setHeldBallots] = createSignal<Record<string, Vote | 'back'>>(
    {},
  );
  const BALLOT_HOLD_MS = 2_000;
  let ballotHideTimer: ReturnType<typeof setTimeout> | undefined;
  let ballotHideFromBoard = false;
  let lastBallotPhase: string | null = null;
  let ceremonyRoomId: string | null = null;
  let ceremonyDecided = false;

  // Session dropped (left / expired) → back to the play menu.
  createEffect(() => {
    if (tutorial.looking() || tutorial.playing()) return;
    if (!game.inRoom()) nav.returnTo('play');
  });

  // After a win, Continue returns this room to lobby — sit there for another game.
  createEffect(() => {
    if (tutorial.looking() || tutorial.playing()) return;
    const state = view();
    if (!state || !game.inRoom()) return;
    if (state.phase === Phase.Lobby) nav.returnTo('waiting-room');
  });

  function cancelBallotHide(): void {
    window.clearTimeout(ballotHideTimer);
    ballotHideTimer = undefined;
    ballotHideFromBoard = false;
    setHideBallots(false);
  }

  function scheduleBallotHide(fromBoard = false): void {
    if (ballotHideFromBoard && !fromBoard) return;
    if (fromBoard) ballotHideFromBoard = true;
    window.clearTimeout(ballotHideTimer);
    ballotHideTimer = window.setTimeout(() => {
      setHideBallots(true);
      setHeldBallots({});
      ballotHideFromBoard = false;
      ballotHideTimer = undefined;
    }, BALLOT_HOLD_MS);
  }

  createEffect(() => {
    const state = view();
    if (!state || onboarding()) {
      cancelBallotHide();
      setHeldBallots({});
      lastBallotPhase = state?.phase ?? null;
      return;
    }
    if (state.phase === Phase.Voting) {
      cancelBallotHide();
      if (!state.players.some((player) => player.hasVoted || player.vote != null)) {
        setHeldBallots({});
      }
    }
    const next: Record<string, Vote | 'back'> = { ...heldBallots() };
    let saw = false;
    for (const player of state.players) {
      if (player.vote != null) {
        next[player.id] = player.vote;
        saw = true;
      } else if (player.hasVoted) {
        next[player.id] = 'back';
        saw = true;
      }
    }
    if (saw) {
      const previous = heldBallots();
      const changed =
        Object.keys(next).some((id) => next[id] !== previous[id]) ||
        Object.keys(previous).length !== Object.keys(next).length;
      if (changed) setHeldBallots(next);
    }
    const previousPhase = lastBallotPhase;
    lastBallotPhase = state.phase;
    // Failed governments go Voting → Nomination; keep Ja/Nein until the next vote.
    if (
      state.phase === Phase.Nomination &&
      (previousPhase === Phase.ChancellorLegislative ||
        previousPhase === Phase.PresidentLegislative)
    ) {
      scheduleBallotHide();
    }
  });
  onCleanup(() => window.clearTimeout(ballotHideTimer));

  onMount(() => {
    const handleBack = () => {
      if (onboarding()) {
        leaveLook();
        return;
      }
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
      if (historyOpen()) {
        setHistoryOpen(false);
        return;
      }
      setConfirmingLeave((open) => !open);
    };
    nav.setBackHandler(handleBack);
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => {
      nav.clearBackHandler(handleBack);
      clearInterval(ticker);
      tutorial.closeActive();
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
    if (tutorial.looking()) return;
    const state = view();
    if (!state) return;
    if (state.roomId !== ceremonyRoomId) {
      ceremonyRoomId = state.roomId;
      ceremonyDecided = false;
      setCeremonyOpen(false);
    }
    if (ceremonyDecided) return;
    now();
    const role = tutorial.playing()
      ? (tutorial.role() ?? state.you.role)
      : (game.role() ?? state.you.role);
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
  const [chaosReveal, setChaosReveal] = createSignal(false);
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
  const [vetoBurn, setVetoBurn] = createSignal<{ chancellorId: string } | null>(
    null,
  );
  let seenVetoLog = 0;
  let sawVetoBaseline = false;
  const [sealFlight, setSealFlight] = createSignal<{
    power: ExecutivePower;
    wellIndex: number;
    presidentId: string;
  } | null>(null);
  let seenActivePower: ExecutivePower | null | undefined = undefined;
  const [officeHandoff, setOfficeHandoff] = createSignal<{
    fromId: string | null;
    toId: string;
    kind: 'president' | 'chancellor';
    special: boolean;
  } | null>(null);
  let seenPresidentId: string | null | undefined = undefined;
  let seenChancellorId: string | null | undefined = undefined;
  let pendingSpecialHandoff = false;
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
      seenActivePower = state.activePower;
      seenPresidentId = state.board.president;
      seenChancellorId = state.board.chancellor;
      setShownLiberal(state.board.liberalPolicies);
      setShownFascist(state.board.fascistPolicies);
      setVetoBurn(null);
      setSealFlight(null);
      setOfficeHandoff(null);
      return;
    }
    const previousTotal = seenPolicyTotal ?? total;
    const previousTracker = seenElectionTracker ?? tracker;
    seenPolicyTotal = total;
    seenElectionTracker = tracker;
    const latest = state.board.lastEnacted[state.board.lastEnacted.length - 1];
    if (total > previousTotal && latest) {
      // Chaos: tracker resets in the same snapshot as the top-of-deck law.
      const chaos = tracker < previousTracker;
      revealEnactedPolicy(latest, chaos);
      void ravi.speak(
        chaos
          ? 'chaos.enacted'
          : latest === 'liberal'
            ? 'law.liberal'
            : 'law.fascist',
      );
      sound.play(
        chaos
          ? 'chaos-enact'
          : latest === 'liberal'
            ? 'law-liberal'
            : 'law-fascist',
      );
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
      !onboarding() &&
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
    const entries = game.logEntries();
    if (!state) return;
    if (!sawVetoBaseline) {
      seenVetoLog = entries.length;
      sawVetoBaseline = true;
      return;
    }
    if (entries.length <= seenVetoLog) return;
    for (const entry of entries.slice(seenVetoLog)) {
      if (entry.code !== 'vetoAgreed') continue;
      const chancellorId =
        state.board.chancellor ??
        state.roundHistory[state.roundHistory.length - 1]?.chancellorId ??
        null;
      if (!chancellorId) continue;
      setVetoBurn({ chancellorId });
    }
    seenVetoLog = entries.length;
  });

  createEffect(() => {
    const state = view();
    if (!state) {
      seenActivePower = undefined;
      return;
    }
    const power = state.activePower;
    if (seenActivePower === undefined) {
      seenActivePower = power;
      return;
    }
    const previous = seenActivePower;
    seenActivePower = power;
    if (previous === 'specialElection' && power == null) {
      pendingSpecialHandoff = true;
    }
    if (power && previous == null && state.board.president) {
      const wellIndex = Math.max(0, state.board.fascistPolicies - 1);
      setSealFlight({
        power,
        wellIndex,
        presidentId: state.board.president,
      });
    }
  });

  createEffect(() => {
    const state = view();
    if (!state) {
      seenPresidentId = undefined;
      return;
    }
    const next = state.board.president;
    if (seenPresidentId === undefined) {
      seenPresidentId = next;
      return;
    }
    const previous = seenPresidentId;
    seenPresidentId = next;
    if (!next || next === previous) return;
    // Opening night names the first President via ceremony — skip placard there.
    if (ceremonyOpen()) return;
    const special = pendingSpecialHandoff;
    pendingSpecialHandoff = false;
    setOfficeHandoff({
      fromId: previous,
      toId: next,
      kind: 'president',
      special,
    });
  });

  createEffect(() => {
    const state = view();
    if (!state) {
      seenChancellorId = undefined;
      return;
    }
    const next = state.board.chancellor;
    if (seenChancellorId === undefined) {
      seenChancellorId = next;
      return;
    }
    const previous = seenChancellorId;
    seenChancellorId = next;
    if (!next || next === previous) return;
    if (ceremonyOpen()) return;
    setOfficeHandoff({
      fromId: previous ?? state.board.president,
      toId: next,
      kind: 'chancellor',
      special: false,
    });
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
    if (endsAt.length === 0 || state.kickVote || state.breathDeadline) {
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

  function revealEnactedPolicy(policy: Policy, chaos = false): void {
    void animation.enqueue(async () => {
      setChaosReveal(chaos);
      setRevealedPolicy(policy);
      await waitFrames(2);
      if (chaos && revealCard) {
        const start = offsetFrom(revealCard, pileEl('draw'));
        if (start) {
          sound.play('policy-draw');
          await animation.playCustom(
            revealCard,
            [
              {
                opacity: 1,
                transform: `translate(${start.x}px, ${start.y}px) scale(0.32) rotate(-14deg)`,
              },
              {
                opacity: 1,
                transform: 'translate(0px, 0px) scale(1.06) rotate(0deg)',
                offset: 0.72,
              },
              { opacity: 1, transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
            ],
            { duration: 700, easing: 'ease-out' },
          );
        } else {
          await animation.play(revealCard, 'policy-reveal');
        }
      } else {
        await animation.play(revealCard, 'policy-reveal');
      }
      await animation.hold(700);
      await flyToTarget(animation, revealCard, emptyWell(policy), {
        landScale: 0.46,
        duration: 620,
      });
      setRevealedPolicy(null);
      setChaosReveal(false);
      if (policy === 'liberal') setShownLiberal((count) => count + 1);
      else setShownFascist((count) => count + 1);
      scheduleBallotHide(true);
    });
  }

  function waitFrames(count: number): Promise<void> {
    return new Promise((resolve) => {
      const step = (left: number) => {
        if (left <= 0) {
          resolve();
          return;
        }
        requestAnimationFrame(() => step(left - 1));
      };
      step(count);
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

  /** Eligible seats sway while Ravi introduces the nomination (not yet tappable). */
  const nominationAwaiting = (player: PublicPlayer) => {
    const state = view();
    if (!state || !inNomination() || choiceOpen(state.nominationDeadline)) return false;
    if (!iAmPresident() || state.kickVote) return false;
    return (
      player.isAlive &&
      player.connected &&
      player.id !== state.you.id &&
      !state.ineligibleChancellors.includes(player.id)
    );
  };

  /** Eligible power targets sway while Ravi introduces the executive power. */
  const powerAwaiting = (player: PublicPlayer) => {
    const state = view();
    if (
      !state ||
      state.kickVote ||
      state.phase !== Phase.SpecialPower ||
      !iAmPresident() ||
      choiceOpen(state.specialPowerDeadline)
    ) {
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

  /** Spectators (and President) see who cannot be Chancellor this round. */
  const nominationDimmed = (player: PublicPlayer) => {
    const state = view();
    if (!state || !inNomination() || !player.isAlive) return false;
    if (player.id === state.board.president) return true;
    return state.ineligibleChancellors.includes(player.id);
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
    if (
      !state ||
      state.kickVote ||
      state.phase !== Phase.SpecialPower ||
      !iAmPresident()
    ) {
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

  const seatSelectable = (player: PublicPlayer) => {
    if (tutorial.looking()) return false;
    if (tutorial.playing()) return tutorial.canSelectSeat(player.id);
    return canNominate(player) || canPowerTarget(player);
  };

  function playYou() {
    return tutorialYou(
      settings.settings.profileName.trim() || formatMessage('game.you'),
      settings.settings.avatar,
      formatMessage,
    );
  }

  function continueLook(): void {
    if (!tutorial.canContinueLook()) return;
    if (!tutorial.lookBlurred() && !lookHeadlineReady()) return;
    if (tutorial.advanceLook()) tutorial.startPlay(playYou(), 5);
  }

  function skipOnboarding(): void {
    if (tutorial.looking()) {
      if (tutorial.skipLookBeat()) tutorial.startPlay(playYou(), 5);
      return;
    }
    if (tutorial.playing() && tutorial.skipToNextPlay()) return;
    leaveLook();
  }

  function leaveLook(): void {
    tutorial.closeActive();
    nav.returnTo('home');
  }

  const canReport = (player: PublicPlayer) => {
    if (tutorial.looking()) return false;
    const state = view();
    const you = game.you();
    if (!flags.enabled('gameKick')) return false;
    if (!state || !you?.isAlive) return false;
    if (!state.you.canRequestKick) return false;
    if (state.phase === Phase.Lobby || state.phase === Phase.GameOver) return false;
    if (state.kickVote || ceremonyOpen()) return false;
    return player.isAlive && player.id !== state.you.id;
  };

  const canMuteOther = (player: PublicPlayer) => {
    if (tutorial.looking()) return false;
    const state = view();
    return flags.enabled('voice') && state != null && player.id !== state.you.id;
  };

  const canOpenPlayerMenu = (player: PublicPlayer) =>
    canReport(player) || canMuteOther(player);

  function nominate(player: PublicPlayer): void {
    setActionCommitted(true);
    game.sendCommand({ kind: 'nominateChancellor', targetId: player.id });
    setPlayersOpen(false);
    setHistoryOpen(false);
  }

  /** True once the auto-timeout clock is running (Ravi/deal hold has elapsed). */
  const choiceOpen = (deadline: { startedAt: number; endsAt: number } | null | undefined) =>
    deadline != null && now() >= deadline.startedAt;

  const secondsUntil = (endsAt: number) =>
    Math.max(0, Math.ceil((endsAt - clockMs()) / 1000));

  function castVote(vote: 'ja' | 'nein'): void {
    if (tutorial.looking()) {
      continueLook();
      return;
    }
    if (tutorial.playing()) {
      tutorial.handlePlay({ kind: 'castVote', vote });
      return;
    }
    game.sendCommand({ kind: 'castVote', vote });
    setActionCommitted(true);
  }

  // During discussion the President's endTurn opens nomination; in the
  // nomination window it ends the round (the engine decides which by state).
  function sendEndTurn(): void {
    setActionCommitted(true);
    game.sendCommand({ kind: 'endTurn' });
  }

  const inNomination = () =>
    view()?.phase === Phase.Nomination && view()?.nominationDeadline != null;

  const legislativeTalkLocked = () => {
    const phase = view()?.phase;
    return (
      phase === Phase.PresidentLegislative ||
      phase === Phase.ChancellorLegislative
    );
  };

  const legislativeActor = () => {
    const state = view();
    if (!state) return false;
    if (state.phase === Phase.PresidentLegislative) {
      return state.you.id === state.board.president;
    }
    if (state.phase === Phase.ChancellorLegislative) {
      return state.you.id === state.board.chancellor;
    }
    return false;
  };

  const isLegislative = () => {
    const state = view();
    if (!state) return false;
    const phase = state.phase;
    if (
      phase !== Phase.PresidentLegislative &&
      phase !== Phase.ChancellorLegislative
    ) {
      return false;
    }
    // Post-law announce breath — keep the choose UI closed for the reveal.
    if (state.breathDeadline) return false;
    return true;
  };
  const myPolicies = () => view()?.you.policies ?? [];
  createEffect((previous?: string) => {
    const stamp = [
      view()?.phase ?? '',
      view()?.legislativeDeadline?.endsAt ?? 0,
      view()?.nominationDeadline?.endsAt ?? 0,
      view()?.specialPowerDeadline?.endsAt ?? 0,
      view()?.voteDeadline?.endsAt ?? 0,
    ].join(':');
    if (previous !== undefined && previous !== stamp) setActionCommitted(false);
    return stamp;
  });
  createEffect(() => {
    if (game.lastError()) setActionCommitted(false);
  });
  const legislativeSecondsLeft = () => {
    if (actionCommitted()) return 0;
    const deadline = view()?.legislativeDeadline;
    if (!deadline) return 0;
    if (now() < deadline.startedAt) return 0;
    return Math.max(0, Math.ceil((deadline.endsAt - clockMs()) / 1000));
  };

  function chooseLegislative(index: number, mode: 'discard' | 'enact'): void {
    if (tutorial.looking()) {
      continueLook();
      return;
    }
    const kind = mode === 'discard' ? 'discardPolicy' : 'enactPolicy';
    setActionCommitted(true);
    if (tutorial.playing()) {
      tutorial.handlePlay({ kind, index });
      return;
    }
    game.sendCommand({ kind, index });
  }

  const iAmChancellor = () => {
    const state = view();
    return state != null && state.board.chancellor === state.you.id;
  };
  const proposeVeto = () => {
    setActionCommitted(true);
    game.sendCommand({ kind: 'vetoRequest' });
  };
  const respondVeto = (agree: boolean) => {
    setActionCommitted(true);
    game.sendCommand({ kind: 'vetoConsent', agree });
  };
  const usePower = (targetId: string) => {
    setActionCommitted(true);
    if (tutorial.playing()) {
      tutorial.handlePlay({ kind: 'useSpecialPower', targetId });
      return;
    }
    game.sendCommand({ kind: 'useSpecialPower', targetId });
  };

  type TableOverlay =
    | 'killed'
    | 'leave'
    | 'over'
    | 'menu'
    | 'players'
    | 'history'
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
    if (state?.phase === Phase.GameOver && state.winner && !onboarding()) {
      return 'over';
    }
    if (menuOpen()) return 'menu';
    if (playersOpen()) return 'players';
    if (historyOpen()) return 'history';
    if (loyaltyCheck()) return 'investigate';
    // Look step: proposed government ticket, then the Ja / Nein cards.
    if (tutorial.looking() && tutorial.target() === 'government') {
      return 'chancellorReveal';
    }
    if (chancellorReveal()) return 'chancellorReveal';
    if (state?.phase === Phase.Voting) return 'vote';
    if (isLegislative() && state?.vetoRequested) return 'veto';
    if (isLegislative()) return 'legislative';
    if (
      state?.phase === Phase.SpecialPower &&
      state.activePower === 'policyPeek' &&
      !state.breathDeadline
    ) {
      return 'power';
    }
    if (ceremonyOpen() && (tutorial.role() ?? game.role() ?? state?.you.role)) {
      return 'night';
    }
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
  const ticketName = (playerId: string | null) => {
    const state = view();
    const player = state?.players.find((seat) => seat.id === playerId);
    if (!player || !state) return '—';
    return playerLabel(player.id === state.you.id, player.name, formatMessage);
  };
  const playerAvatar = (playerId: string | null) =>
    view()?.players.find((player) => player.id === playerId)?.avatar ?? 0;
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
    const messages =
      tutorial.looking() || tutorial.playing()
        ? tutorial.talk()
        : game.chatMessages();
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.playerId !== playerId) continue;
      if (now() - message.at >= BUBBLE_MS) return undefined;
      if ('key' in message && message.key) {
        return formatMessage(message.key, message.values);
      }
      return message.text;
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
      if (state.you.investigation) {
        return formatMessage('game.power.investigationResult', {
          name: isolateBidi(state.you.investigation.name),
          party: formatMessage(`game.${state.you.investigation.party}`),
        });
      }
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

  const powerHeadline = () => {
    const state = view();
    return state?.phase === Phase.SpecialPower && state.activePower != null;
  };

  // Power dock is gone; the parchment is the only instruction during a power.
  function eventHeadline(): string {
    if (onboarding()) return formatMessage(tutorial.headlineKey());
    if (powerHeadline()) return helpMessage();
    if (legislativeActor()) return helpMessage();
    if (legislativeTalkLocked()) return formatMessage('ravi.law.silence');
    return ravi.line() ?? helpMessage();
  }

  function onSeat(player: PublicPlayer): void {
    if (tutorial.looking()) {
      continueLook();
      return;
    }
    if (tutorial.playing()) {
      if (tutorial.lock() === 'nominate') {
        tutorial.handlePlay({ kind: 'nominateChancellor', targetId: player.id });
      } else if (
        tutorial.lock() === 'execute' ||
        tutorial.lock() === 'investigate' ||
        tutorial.lock() === 'specialElection'
      ) {
        tutorial.handlePlay({ kind: 'useSpecialPower', targetId: player.id });
      }
      return;
    }
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

  function skipDevWait(): void {
    ravi.skip();
    game.sendCommand({ kind: 'skipTimer' });
  }

  function seatBallot(player: PublicPlayer): Vote | 'back' | null {
    if (hideBallots()) return null;
    if (player.vote != null) return player.vote;
    const held = heldBallots()[player.id];
    // Fail-breath snapshots may keep hasVoted after the face is already held.
    if (held != null && held !== 'back') return held;
    if (player.hasVoted) return 'back';
    return held ?? null;
  }

  const suppressOffice = (player: PublicPlayer) => {
    const hand = officeHandoff();
    if (!hand || hand.toId !== player.id) return false;
    return hand.kind === 'president'
      ? player.isPresident
      : player.isChancellor;
  };

  return (
    <Screen fill>
      {/* A new snapshot is a new object; remounting would rebuild every seat. */}
      <Show when={view()} keyed={false}>
        {(state) => (
          <div
            classList={{
              [styles.scene]: true,
              [styles.sceneLooking]: onboarding(),
              [styles.sceneLookChat]: tutorial.looking() && tutorial.lookChat(),
            }}
            style={{
              '--chat-panel-height': `${tutorial.looking() && !tutorial.lookChat() ? 0 : chatHeight()}px`,
            }}
          >
            <Show when={!tutorial.lookBlurred()}>
            <GameEventHeader
              headline={eventHeadline()}
              durationMs={
                onboarding() || powerHeadline()
                  ? undefined
                  : ravi.lineDurationMs()
              }
              onTyped={
                tutorial.looking()
                  ? (done, text) => {
                      setLookHeadlineTyped({ text, done });
                      if (done) tutorial.lookHeadlineFinished();
                    }
                  : undefined
              }
            />
            </Show>

            <div class={styles.body}>
            <DeckStrip
              drawCount={state().board.drawPile + drawHold()}
              discardCount={state().board.discardPile}
              electionTracker={state().board.electionTracker}
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
                playerCount={state().players.length}
                formatMessage={formatMessage}
              />

              <div class={styles.players}>
                <div class={styles.seats} role="list" data-tutorial-target="seats">
                  <For each={seatedPlayers()}>
                    {(player) => (
                      <TableSeat
                        player={player}
                        isYou={player.id === state().you.id}
                        isNext={player.id === nextPresidentId()}
                        selectable={seatSelectable(player)}
                        awaitingPick={
                          nominationAwaiting(player) || powerAwaiting(player)
                        }
                        reportable={
                          canOpenPlayerMenu(player) && !seatSelectable(player)
                        }
                        termLocked={
                          termLocked(player) ||
                          awayFromTable(player) ||
                          alreadyInvestigated(player)
                        }
                        nominationDimmed={nominationDimmed(player)}
                        showPublicMarks={!ceremonyOpen()}
                        bubble={bubbleFor(player.id)}
                        ballot={seatBallot(player)}
                        suppressOffice={suppressOffice(player)}
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
                presidentName={isolateBidi(ticketName(state().board.president))}
                chancellorName={isolateBidi(ticketName(state().board.chancellor))}
                presidentAvatar={playerAvatar(state().board.president)}
                chancellorAvatar={playerAvatar(state().board.chancellor)}
                canVote={
                  state().you.vote == null &&
                  (onboarding() || !!game.you()?.isAlive)
                }
                yourVote={state().you.vote}
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

            <Show when={!tutorial.looking() || tutorial.lookChat()}>
            <ChatPanel
              composerEnabled={onboarding() || game.you()?.isAlive !== false}
              talkingAllowed={
                !ceremonyOpen() &&
                !legislativeTalkLocked() &&
                (!tutorial.looking() || tutorial.lookTyping())
              }
              composeHint={
                tutorial.lookComposeHint()
                  ? formatMessage(tutorial.lookComposeHintKey())
                  : undefined
              }
              suppressActionClock={actionCommitted()}
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
              onOpenHistory={() => setHistoryOpen(true)}
              onSkipTimer={
                import.meta.env.DEV &&
                import.meta.env.MODE !== 'test' &&
                state().adminPlay
                  ? () => skipDevWait()
                  : undefined
              }
              onOpenMenu={() => setMenuOpen(true)}
              onHeightChange={setChatHeight}
            />
            </Show>

            <Show when={onboarding()}>
              <div
                class={styles.lookChromeSpacer}
                data-look-chrome-spacer
                aria-hidden="true"
              />
              <Show when={tutorial.lookBlurred()}>
                <div class={styles.lookSeeNext} aria-live="polite">
                  <p class={styles.lookSeeNextText} dir="auto">
                    {formatMessage(tutorial.headlineKey())}
                  </p>
                </div>
              </Show>
              <Spotlight
                target={tutorial.target()}
                lifted={tutorial.maskLifted() || tutorial.lookBlurred()}
                passHole={tutorial.lookPassHole()}
                layoutKey={chatHeight() + tutorial.talk().length}
                continueLabel={
                  tutorial.looking()
                    ? formatMessage(tutorial.lookContinueKey())
                    : undefined
                }
                showContinue={
                  (tutorial.looking() &&
                    tutorial.canContinueLook() &&
                    lookHeadlineReady()) ||
                  tutorial.lock() === 'delta' ||
                  tutorial.lock() === 'night' ||
                  (tutorial.playing() && view()?.winner != null)
                }
                showSkip={!tutorial.looking() || lookHeadlineReady()}
                showPrevious={
                  tutorial.looking() && tutorial.beat() > 0 && lookHeadlineReady()
                }
                onPrevious={() => tutorial.retreatLook()}
                onContinue={() => {
                  if (tutorial.looking()) continueLook();
                  else if (tutorial.lock() === 'delta') tutorial.acknowledgeDelta();
                  else if (tutorial.lock() === 'night') {
                    setCeremonyOpen(false);
                    tutorial.finishNight();
                  } else if (tutorial.playing() && view()?.winner) {
                    if (!tutorial.continueLadder()) leaveLook();
                  }
                }}
                onSkip={skipOnboarding}
                formatMessage={formatMessage}
              />
            </Show>

            <Show when={!onboarding()}>
            <RaviNarrator
              ceremonyOpen={ceremonyOpen()}
              now={clockMs()}
              chancellorReveal={chancellorReveal()}
            />
            </Show>

            <Show when={tableOverlay() === 'night' && (tutorial.role() ?? game.role())}>
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
                    tutorial.finishNight();
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
                  label={
                    chaosReveal()
                      ? formatMessage('ravi.chaos.enacted')
                      : formatMessage(`policyReveal.${policy()}`)
                  }
                  cardRef={(element) => (revealCard = element)}
                />
              )}
            </Show>

            <Show when={vetoBurn()}>
              {(burn) => (
                <VetoBurnOverlay
                  chancellorId={burn().chancellorId}
                  onDone={() => setVetoBurn(null)}
                />
              )}
            </Show>

            <Show when={sealFlight()}>
              {(flight) => (
                <SealFlightOverlay
                  power={flight().power}
                  wellIndex={flight().wellIndex}
                  presidentId={flight().presidentId}
                  onDone={() => setSealFlight(null)}
                />
              )}
            </Show>

            <Show when={officeHandoff()}>
              {(hand) => (
                <OfficeHandoffOverlay
                  fromId={hand().fromId}
                  toId={hand().toId}
                  kind={hand().kind}
                  special={hand().special}
                  formatMessage={formatMessage}
                  onDone={() => setOfficeHandoff(null)}
                />
              )}
            </Show>

            <Show when={tableOverlay() === 'chancellorReveal'}>
              <ChancellorReveal
                formatMessage={formatMessage}
                presidentIsYou={iAmPresident()}
                chancellorIsYou={iAmChancellor()}
                presidentName={isolateBidi(ticketName(state().board.president))}
                chancellorName={isolateBidi(ticketName(state().board.chancellor))}
                presidentAvatar={playerAvatar(state().board.president)}
                chancellorAvatar={playerAvatar(state().board.chancellor)}
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
                        {...commitOnPress(() => respondVeto(true))}
                      >
                        {formatMessage('game.veto.agree')}
                      </button>
                      <button
                        type="button"
                        class={styles.voteNein}
                        {...commitOnPress(() => respondVeto(false))}
                      >
                        {formatMessage('game.veto.reject')}
                      </button>
                    </div>
                  </Show>
                  <Show when={legislativeSecondsLeft() > 0}>
                    <span class={styles.voteWaiting}>
                      {formatMessage('game.secondsLeft', {
                        seconds: legislativeSecondsLeft(),
                      })}
                    </span>
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

            <Show when={tableOverlay() === 'power'}>
              <PeekOverlay
                policies={state().you.peek}
                formatMessage={formatMessage}
                onContinue={() => {
                  if (iAmPresident()) usePower('');
                }}
              />
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

            <RoundHistoryModal
              open={tableOverlay() === 'history'}
              rounds={state().roundHistory}
              formatMessage={formatMessage}
              onClose={() => setHistoryOpen(false)}
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
              onInspectRole={() => {
                setMenuOpen(false);
                setInspectingRole(true);
              }}
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
              confirmOnPointerDown
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
