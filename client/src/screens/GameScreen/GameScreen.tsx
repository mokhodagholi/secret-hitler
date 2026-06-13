import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import {
  Phase,
  VOTE_DURATION_MS,
  type Policy,
  type PublicPlayer,
} from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { ERROR_MESSAGE_KEYS } from '../../i18n';
import { isolateBidi } from '../../i18n/utils';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { Toast } from '../../components/Toast/Toast';
import { PolicyBoard } from './PolicyBoard';
import { SpeakerBar } from './SpeakerBar';
import { StatusRow } from './StatusRow';
import { PlayersModal } from './PlayersModal';
import { NominationModal } from './NominationModal';
import { GameMenu } from './GameMenu';
import { LegislativeModal } from './LegislativeModal';
import { VotingOverlay } from './VotingOverlay';
import { PowerPanel } from './PowerPanel';
import { GameOverOverlay } from './GameOverOverlay';
import { PolicyRevealOverlay } from './PolicyRevealOverlay';
import styles from './GameScreen.module.scss';

/**
 * Main game screen, kept deliberately minimal: a status row (role, players,
 * timer) and the policy board (draw/discard stacks + tracks). Chat and the game
 * log live on their own page behind the chat button; round detail (current
 * turn, status, election tracker, government) lives behind the info button.
 * Phase actions arrive as modals; turn changes raise a toast. State is the
 * server's.
 */
export function GameScreen() {
  const { nav, game, i18n, settings, animation } = useApp();
  const { formatMessage } = i18n;
  const showTimer = () => settings.settings.timerEnabled;

  const view = game.view;
  const [confirmingLeave, setConfirmingLeave] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [playersOpen, setPlayersOpen] = createSignal(false);
  const [now, setNow] = createSignal(Date.now());

  let boardElement: HTMLElement | undefined;

  // Session dropped (left / expired) → back to the play menu.
  createEffect(() => {
    if (!game.inRoom()) nav.navigate('play');
  });

  onMount(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => clearInterval(ticker));
  });

  // --- Turn-change toasts ---------------------------------------------------
  // A strong cue when the floor reaches this player, a quiet one as it leaves.
  const [toast, setToast] = createSignal<{
    title?: string;
    message: string;
    variant: 'prominent' | 'subtle';
  } | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let lastSpeakerId: string | null = null;
  let sawSpeakerBaseline = false;

  function showToast(next: NonNullable<ReturnType<typeof toast>>): void {
    clearTimeout(toastTimer);
    setToast(next);
    toastTimer = setTimeout(
      () => setToast(null),
      next.variant === 'prominent' ? 4200 : 2600,
    );
  }
  onCleanup(() => clearTimeout(toastTimer));

  createEffect(() => {
    const state = view();
    const currentSpeakerId = state?.speaker?.playerId ?? null;
    if (currentSpeakerId === lastSpeakerId) return;
    const previousSpeakerId = lastSpeakerId;
    lastSpeakerId = currentSpeakerId;
    // Skip the first observed turn (join/rejoin) so we don't announce history.
    if (!sawSpeakerBaseline) {
      sawSpeakerBaseline = true;
      return;
    }
    const youId = state?.you.id;
    if (currentSpeakerId && currentSpeakerId === youId) {
      showToast({
        variant: 'prominent',
        title: formatMessage('game.turnStartTitle'),
        message: formatMessage('game.turnStartBody'),
      });
    } else if (previousSpeakerId === youId) {
      showToast({
        variant: 'subtle',
        message: currentSpeakerId
          ? formatMessage('game.turnEnded', {
              name: isolateBidi(playerName(currentSpeakerId)),
            })
          : formatMessage('game.turnOver'),
      });
    }
  });

  // --- Policy enactment reveal ----------------------------------------------
  // The server broadcasts full state, so an enactment is detected as a diff:
  // the policy total grew within the same room. (lastEnacted caps at 5 entries,
  // so its length is not a reliable counter.)
  const [revealedPolicy, setRevealedPolicy] = createSignal<Policy | null>(null);
  // Set to the new tracker count when a government fails, for the notice dialog.
  const [electionFailedAt, setElectionFailedAt] = createSignal<number | null>(null);
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
      return;
    }
    const total = state.board.liberalPolicies + state.board.fascistPolicies;
    const tracker = state.board.electionTracker;
    if (state.roomId !== seenRoomId) {
      // First snapshot of a room (join/rejoin) — baseline, don't replay history.
      seenRoomId = state.roomId;
      seenPolicyTotal = total;
      seenElectionTracker = tracker;
      return;
    }
    const previousTotal = seenPolicyTotal ?? total;
    const previousTracker = seenElectionTracker ?? tracker;
    seenPolicyTotal = total;
    seenElectionTracker = tracker;
    const latest = state.board.lastEnacted[state.board.lastEnacted.length - 1];
    if (total > previousTotal && latest) revealEnactedPolicy(latest);
    // A failed government jolts the board and raises a notice (a reset to 0 is
    // chaos, not a failure).
    if (tracker > previousTracker) {
      void animation.play(boardElement, 'shake');
      setElectionFailedAt(tracker);
    }
  });

  function revealEnactedPolicy(policy: Policy): void {
    void animation.enqueue(async () => {
      setRevealedPolicy(policy);
      await animation.play(revealCard, 'policy-reveal');
      await animation.hold(900);
      await animation.play(revealCard, 'policy-exit');
      setRevealedPolicy(null);
    });
  }

  const iAmPresident = () => {
    const state = view();
    return state != null && state.board.president === state.you.id;
  };

  const canNominate = (player: PublicPlayer) => {
    const state = view();
    return (
      state?.phase === Phase.Nomination &&
      iAmPresident() &&
      player.isAlive &&
      player.id !== state.you.id &&
      !state.ineligibleChancellors.includes(player.id)
    );
  };

  function nominate(player: PublicPlayer): void {
    game.sendCommand({ kind: 'nominateChancellor', targetId: player.id });
    setPlayersOpen(false);
  }

  const voters = () =>
    view()?.players.filter((player) => player.isAlive && player.connected) ?? [];
  const votedCount = () => voters().filter((player) => player.hasVoted).length;
  const voteSecondsLeft = () => {
    const deadline = view()?.voteDeadline;
    return deadline ? Math.max(0, Math.ceil((deadline.endsAt - now()) / 1000)) : 0;
  };
  const voteProgress = () =>
    Math.max(0, Math.min(1, (voteSecondsLeft() * 1000) / VOTE_DURATION_MS));

  const speakerPlayer = () =>
    view()?.players.find((player) => player.id === game.speaker()?.playerId) ??
    null;

  const secondsUntil = (endsAt: number) =>
    Math.max(0, Math.ceil((endsAt - now()) / 1000));

  // Whichever phase clock is running right now, for the compact status row.
  const activeDeadline = () =>
    view()?.voteDeadline ??
    view()?.legislativeDeadline ??
    view()?.nominationDeadline ??
    game.speaker();
  const activeSecondsLeft = () => {
    const deadline = activeDeadline();
    return deadline ? secondsUntil(deadline.endsAt) : null;
  };
  const nominationSecondsLeft = () => {
    const deadline = view()?.nominationDeadline;
    return deadline ? secondsUntil(deadline.endsAt) : 0;
  };

  function castVote(vote: 'ja' | 'nein'): void {
    game.sendCommand({ kind: 'castVote', vote });
  }

  // endTurn passes the discussion turn; in the nomination window the President's
  // endTurn ends the round (the engine decides which by phase).
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
    return deadline ? Math.max(0, Math.ceil((deadline.endsAt - now()) / 1000)) : 0;
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

  const powerTargets = () => {
    const state = view();
    if (!state) return [];
    return state.players.filter(
      (player) => player.isAlive && player.id !== state.you.id,
    );
  };
  const usePower = (targetId: string) =>
    game.sendCommand({ kind: 'useSpecialPower', targetId });

  const playerName = (playerId: string | null) =>
    view()?.players.find((player) => player.id === playerId)?.name ?? '—';

  function leaveRoom(): void {
    setConfirmingLeave(false);
    game.leaveRoom();
    nav.navigate('play');
  }

  return (
    <Screen>
      <Show when={view()}>
        {(state) => (
          <div class={styles.layout}>
            <header class={styles.topBar}>
              <span class={styles.roomName}>{state().name}</span>
              <button
                type="button"
                class={styles.menuButton}
                aria-label={formatMessage('game.openChat')}
                onClick={() => nav.navigate('chat')}
              >
                <Icon name="chat" size={19} />
                <Show when={game.unreadChat() > 0}>
                  <span class={styles.badge} />
                </Show>
              </button>
              <button
                type="button"
                class={styles.menuButton}
                aria-label={formatMessage('settings.title')}
                onClick={() => setMenuOpen(true)}
              >
                <Icon name="gear" size={19} />
              </button>
            </header>

            <section
              class={styles.boardColumn}
              ref={(element) => (boardElement = element)}
            >
              <Show when={game.role()}>
                <StatusRow
                  role={game.role()!}
                  playerCount={state().players.length}
                  maxPlayers={state().maxPlayers}
                  secondsLeft={activeSecondsLeft()}
                  onOpenPlayers={() => setPlayersOpen(true)}
                  formatMessage={formatMessage}
                />
              </Show>

              <PolicyBoard
                board={state().board}
                presidentName={playerName(state().board.president)}
                chancellorName={playerName(state().board.chancellor)}
                formatMessage={formatMessage}
              />
            </section>

            <Show when={game.inDiscussion()}>
              <SpeakerBar
                isMine={game.isMySpeakingTurn()}
                speakerName={speakerPlayer()?.name ?? ''}
                secondsLeft={activeSecondsLeft()}
                onEndTurn={sendEndTurn}
                formatMessage={formatMessage}
              />
            </Show>

            <Show when={inNomination() && !iAmPresident() && !!game.you()?.isAlive}>
              <p class={styles.hint}>
                {formatMessage('game.nominateWaiting', {
                  name: isolateBidi(playerName(state().board.president)),
                })}
              </p>
            </Show>

            <Show when={inNomination() && iAmPresident()}>
              <NominationModal
                players={state().players}
                youId={state().you.id}
                secondsLeft={nominationSecondsLeft()}
                canNominate={canNominate}
                onNominate={nominate}
                onEndRound={sendEndTurn}
                formatMessage={formatMessage}
              />
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

            <Show when={state().phase === Phase.Voting}>
              <VotingOverlay
                formatMessage={formatMessage}
                prompt={formatMessage('game.votePrompt', {
                  name: isolateBidi(playerName(state().board.chancellor)),
                })}
                canVote={state().you.vote == null && !!game.you()?.isAlive}
                yourVote={state().you.vote}
                votedCount={votedCount()}
                totalVoters={voters().length}
                showTimer={showTimer()}
                secondsLeft={voteSecondsLeft()}
                progress={voteProgress()}
                onVote={castVote}
              />
            </Show>

            <Show when={isLegislative() && state().vetoRequested}>
              <div class={styles.votePanel}>
                <span class={styles.votePrompt}>
                  {formatMessage('game.veto.consentPrompt')}
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
            </Show>

            <Show when={isLegislative() && !state().vetoRequested}>
              <Show
                when={myPolicies().length > 0}
                fallback={
                  <div class={styles.votePanel}>
                    <span class={styles.voteWaiting}>
                      {state().phase === Phase.PresidentLegislative
                        ? formatMessage('game.presidentChoosing', {
                            name: isolateBidi(playerName(state().board.president)),
                          })
                        : formatMessage('game.chancellorChoosing', {
                            name: isolateBidi(
                              playerName(state().board.chancellor),
                            ),
                          })}
                    </span>
                  </div>
                }
              >
                <LegislativeModal
                  mode={
                    state().phase === Phase.PresidentLegislative
                      ? 'discard'
                      : 'enact'
                  }
                  policies={myPolicies()}
                  secondsLeft={legislativeSecondsLeft()}
                  canVeto={
                    state().phase === Phase.ChancellorLegislative &&
                    state().vetoUnlocked &&
                    iAmChancellor()
                  }
                  onPick={chooseLegislative}
                  onVeto={proposeVeto}
                  formatMessage={formatMessage}
                />
              </Show>
            </Show>

            <Show when={state().phase === Phase.SpecialPower && state().activePower}>
              <PowerPanel
                formatMessage={formatMessage}
                power={state().activePower!}
                isPresident={iAmPresident()}
                presidentName={playerName(state().board.president)}
                peek={state().you.peek}
                investigation={state().you.investigation}
                targets={powerTargets()}
                onTarget={usePower}
                onContinue={() => usePower('')}
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
              open={playersOpen()}
              players={state().players}
              youId={state().you.id}
              formatMessage={formatMessage}
              canNominate={() => false}
              onNominate={() => {}}
              onClose={() => setPlayersOpen(false)}
            />

            <GameMenu
              open={menuOpen()}
              roomName={state().name}
              onClose={() => setMenuOpen(false)}
              onViewRules={() => nav.navigate('rules')}
              onLeave={() => {
                setMenuOpen(false);
                setConfirmingLeave(true);
              }}
            />

            <ConfirmDialog
              open={confirmingLeave()}
              message={formatMessage(
                game.isHost() ? 'leaveDialog.hostMessage' : 'leaveDialog.message',
              )}
              confirmLabel={formatMessage('leaveDialog.confirm')}
              cancelLabel={formatMessage('common.cancel')}
              onConfirm={leaveRoom}
              onCancel={() => setConfirmingLeave(false)}
            />

            <ConfirmDialog
              open={electionFailedAt() != null}
              message={formatMessage('game.electionFailed', {
                count: electionFailedAt() ?? 0,
              })}
              confirmLabel={formatMessage('common.ok')}
              onConfirm={() => setElectionFailedAt(null)}
            />

            <Show when={state().phase === Phase.GameOver && state().winner}>
              <GameOverOverlay
                formatMessage={formatMessage}
                winner={state().winner!}
                players={state().players}
                onLeave={() => {
                  game.leaveRoom();
                  nav.navigate('play');
                }}
              />
            </Show>
          </div>
        )}
      </Show>
    </Screen>
  );
}
