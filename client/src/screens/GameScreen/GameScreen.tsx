import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
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
import { Screen } from '../../components/Screen/Screen';
import { Toast } from '../../components/Toast/Toast';
import { GameEventHeader, governmentLabel } from './GameEventHeader';
import { DeckStrip } from './DeckStrip';
import { TableSeat } from './TableSeat';
import { HelpBar } from './HelpBar';
import { PolicyBoard } from './PolicyBoard';
import { PlayersModal } from './PlayersModal';
import { GameMenu } from './GameMenu';
import { LegislativeModal } from './LegislativeModal';
import { VotingOverlay } from './VotingOverlay';
import { PowerPanel } from './PowerPanel';
import { GameOverOverlay } from './GameOverOverlay';
import { PolicyRevealOverlay } from './PolicyRevealOverlay';
import { NightOverlay } from './NightOverlay';
import { RaviNarrator } from './RaviNarrator';
import { RAVI } from '../../assets/cards';
import styles from './GameScreen.module.scss';

/**
 * Main game screen. A parchment header with the current instruction, a deck
 * strip, two rows of seats around the policy boards, and table tools.
 * Phase actions still arrive as overlays; state is the server's.
 */
export function GameScreen() {
  const { nav, game, i18n, settings, animation, ravi } = useApp();
  const { formatMessage } = i18n;
  const showTimer = () => settings.settings.timerEnabled;

  const view = game.view;
  const [confirmingLeave, setConfirmingLeave] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [playersOpen, setPlayersOpen] = createSignal(false);
  const [now, setNow] = createSignal(Date.now());

  let boardElement: HTMLElement | undefined;

  const CEREMONY_GRACE_MS = 25_000;
  const [ceremonyOpen, setCeremonyOpen] = createSignal(false);
  let ceremonyRoomId: string | null = null;
  let ceremonyDecided = false;

  // Session dropped (left / expired) → back to the play menu.
  createEffect(() => {
    if (!game.inRoom()) nav.navigate('play');
  });

  onMount(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => clearInterval(ticker));
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
    const freshStart =
      !!role &&
      state.phase === Phase.Nomination &&
      start > 0 &&
      now() - start < CEREMONY_GRACE_MS &&
      state.board.liberalPolicies === 0 &&
      state.board.fascistPolicies === 0 &&
      state.board.electionTracker === 0;
    ceremonyDecided = true;
    if (freshStart) setCeremonyOpen(true);
  });

  // --- Round-start toasts ---------------------------------------------------
  // A strong cue when a new round's discussion opens on this player as
  // President, a quiet one otherwise.
  const [toast, setToast] = createSignal<{
    title?: string;
    message: string;
    variant: 'prominent' | 'subtle';
  } | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let lastDiscussionStart = 0;
  let sawDiscussionBaseline = false;

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
    const start = state?.discussionDeadline?.startedAt ?? 0;
    if (start === 0 || start === lastDiscussionStart) return;
    lastDiscussionStart = start;
    // Skip the first observed window (join/rejoin) so we don't replay history.
    if (!sawDiscussionBaseline) {
      sawDiscussionBaseline = true;
      return;
    }
    if (state!.board.president === state!.you.id) {
      showToast({
        variant: 'prominent',
        title: formatMessage('game.discussionTitle'),
        message: formatMessage('game.discussionPresidentBody'),
      });
    } else {
      showToast({
        variant: 'subtle',
        message: formatMessage('game.discussionBody'),
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

  const secondsUntil = (endsAt: number) =>
    Math.max(0, Math.ceil((endsAt - now()) / 1000));

  const activeDeadline = () =>
    view()?.voteDeadline ??
    view()?.legislativeDeadline ??
    view()?.nominationDeadline ??
    view()?.discussionDeadline;

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

  const seatedPlayers = () =>
    [...(view()?.players ?? [])].sort((a, b) => a.seat - b.seat);

  const topSeats = () => {
    const seated = seatedPlayers();
    return seated.slice(0, Math.ceil(seated.length / 2));
  };

  const bottomSeats = () => {
    const seated = seatedPlayers();
    return seated.slice(Math.ceil(seated.length / 2));
  };

  const nextPresidentId = () => {
    const living = seatedPlayers().filter((player) => player.isAlive);
    const presidentId = view()?.board.president;
    if (living.length === 0) return null;
    const index = living.findIndex((player) => player.id === presidentId);
    if (index < 0) return living[0].id;
    return living[(index + 1) % living.length].id;
  };

  const BUBBLE_MS = 8_000;
  const bubbleFor = (playerId: string) => {
    const messages = game.chatMessages();
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].playerId !== playerId) continue;
      return now() - messages[i].at < BUBBLE_MS ? messages[i].text : undefined;
    }
    return undefined;
  };

  const timerProgress = () => {
    if (!showTimer()) return null;
    const deadline = activeDeadline();
    if (!deadline) return null;
    const span = deadline.endsAt - deadline.startedAt;
    if (span <= 0) return null;
    return Math.max(0, Math.min(1, (deadline.endsAt - now()) / span));
  };

  function helpMessage(): string {
    const state = view();
    if (!state) return formatMessage('game.help.elect');
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
      return formatMessage('game.help.vote');
    }
    if (state.phase === Phase.PresidentLegislative) {
      return myPolicies().length
        ? formatMessage('game.presidentDiscardHint')
        : formatMessage('game.presidentChoosing', {
            name: isolateBidi(playerName(state.board.president)),
          });
    }
    if (state.phase === Phase.ChancellorLegislative) {
      return myPolicies().length
        ? formatMessage('game.chancellorEnactHint')
        : formatMessage('game.chancellorChoosing', {
            name: isolateBidi(playerName(state.board.chancellor)),
          });
    }
    if (state.phase === Phase.SpecialPower) {
      return formatMessage('game.power.inProgress', {
        name: isolateBidi(playerName(state.board.president)),
      });
    }
    return formatMessage('game.help.elect');
  }

  function onSeat(player: PublicPlayer): void {
    if (canNominate(player)) nominate(player);
  }

  function leaveRoom(): void {
    setConfirmingLeave(false);
    game.leaveRoom();
    nav.navigate('play');
  }

  return (
    <Screen>
      <Show when={view()}>
        {(state) => (
          <div class={styles.scene}>
            <GameEventHeader
              headline={ravi.line() ?? helpMessage()}
              governmentLabel={governmentLabel(
                state().board.liberalPolicies + state().board.fascistPolicies,
                formatMessage,
              )}
              raviSrc={ravi.speaking() ? RAVI.speaking : RAVI.idle}
              raviSpeaking={ravi.speaking()}
              actionLabel={
                game.inDiscussion() && iAmPresident()
                  ? formatMessage('game.startNomination')
                  : inNomination() && iAmPresident()
                    ? formatMessage('game.endRound')
                    : undefined
              }
              onAction={
                (game.inDiscussion() || inNomination()) && iAmPresident()
                  ? sendEndTurn
                  : undefined
              }
            />

            <DeckStrip
              drawCount={state().board.drawPile}
              discardCount={state().board.discardPile}
              electionTracker={state().board.electionTracker}
              candidateName={playerName(state().board.president)}
              formatMessage={formatMessage}
            />

            <div class={styles.table} ref={(element) => (boardElement = element)}>
              <PolicyBoard
                board={state().board}
                playerCount={state().players.length}
                formatMessage={formatMessage}
              />

              <div class={styles.seats} role="list">
                <For each={topSeats()}>
                  {(player) => (
                    <TableSeat
                      player={player}
                      isYou={player.id === state().you.id}
                      isNext={player.id === nextPresidentId()}
                      nominatable={canNominate(player)}
                      bubble={bubbleFor(player.id)}
                      timerProgress={timerProgress()}
                      onSelect={() => onSeat(player)}
                      formatMessage={formatMessage}
                    />
                  )}
                </For>
              </div>

              <div class={styles.seats} role="list">
                <For each={bottomSeats()}>
                  {(player) => (
                    <TableSeat
                      player={player}
                      isYou={player.id === state().you.id}
                      isNext={player.id === nextPresidentId()}
                      nominatable={canNominate(player)}
                      bubble={bubbleFor(player.id)}
                      timerProgress={timerProgress()}
                      onSelect={() => onSeat(player)}
                      formatMessage={formatMessage}
                    />
                  )}
                </For>
              </div>
            </div>

            <div class={styles.toolsDock}>
              <HelpBar
                unreadChat={game.unreadChat() > 0}
                onOpenChat={() => nav.navigate('chat')}
                onOpenPlayers={() => setPlayersOpen(true)}
                onOpenMenu={() => setMenuOpen(true)}
                onRaiseHand={() => game.sendChat('✋')}
                onEmoji={(emoji) => game.sendChat(emoji)}
                formatMessage={formatMessage}
              />
            </div>

            <RaviNarrator ceremonyOpen={ceremonyOpen()} now={now()} />

            <Show when={ceremonyOpen() && game.role()}>
              {(role) => (
                <NightOverlay
                  role={role()}
                  playerCount={state().players.length}
                  teammates={state().players.filter(
                    (player) => player.role != null && player.id !== state().you.id,
                  )}
                  presidentName={isolateBidi(playerName(state().board.president))}
                  onDone={() => {
                    setCeremonyOpen(false);
                    void ravi.speak('discuss.start');
                  }}
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
