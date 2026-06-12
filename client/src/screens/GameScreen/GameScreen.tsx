import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import {
  Phase,
  VOTE_DURATION_MS,
  type Policy,
  type PublicPlayer,
} from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { ERROR_MESSAGE_KEYS } from '../../i18n';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { PolicyBoard } from './PolicyBoard';
import { StatusRow } from './StatusRow';
import { PlayersModal } from './PlayersModal';
import { NominationModal } from './NominationModal';
import { InfoPanel } from './InfoPanel';
import { GameMenu } from './GameMenu';
import { LegislativeModal } from './LegislativeModal';
import { VotingOverlay } from './VotingOverlay';
import { PowerPanel } from './PowerPanel';
import { GameOverOverlay } from './GameOverOverlay';
import { PolicyRevealOverlay } from './PolicyRevealOverlay';
import styles from './GameScreen.module.scss';

/**
 * Main game screen, kept deliberately minimal: a status row (role, players,
 * timer), the policy board (draw/discard stacks + tracks) and the chat. Round
 * detail (current turn, status, election tracker, government) lives behind the
 * info button; phase actions arrive as modals. State is the server's.
 */
export function GameScreen() {
  const { nav, game, i18n, settings, animation } = useApp();
  const { formatMessage } = i18n;
  const showTimer = () => settings.settings.timerEnabled;

  const view = game.view;
  const [activeTab, setActiveTab] = createSignal<'chat' | 'log'>('chat');
  const [chatDraft, setChatDraft] = createSignal('');
  const [confirmingLeave, setConfirmingLeave] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [playersOpen, setPlayersOpen] = createSignal(false);
  const [infoOpen, setInfoOpen] = createSignal(false);
  const [now, setNow] = createSignal(Date.now());

  let chatScroller: HTMLDivElement | undefined;
  let boardElement: HTMLElement | undefined;

  // Session dropped (left / expired) → back to the play menu.
  createEffect(() => {
    if (!game.inRoom()) nav.navigate('play');
  });

  onMount(() => {
    const ticker = setInterval(() => setNow(Date.now()), 500);
    onCleanup(() => clearInterval(ticker));
  });

  const speaker = () => view()?.speaker ?? null;
  const isMySpeakingTurn = () => {
    const state = view();
    return state?.speaker?.playerId === state?.you.id;
  };
  const chatLocked = () => speaker() != null && !isMySpeakingTurn();

  // Keep the chat pinned to the newest message.
  createEffect(() => {
    game.chatMessages();
    game.logEntries();
    if (chatScroller) chatScroller.scrollTop = chatScroller.scrollHeight;
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
    view()?.players.find((player) => player.id === speaker()?.playerId) ?? null;

  const secondsUntil = (endsAt: number) =>
    Math.max(0, Math.ceil((endsAt - now()) / 1000));

  // Whichever phase clock is running right now, for the compact status row.
  const activeDeadline = () =>
    view()?.voteDeadline ??
    view()?.legislativeDeadline ??
    view()?.nominationDeadline ??
    speaker();
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

  const inDiscussion = () =>
    view()?.phase === Phase.Nomination &&
    speaker() != null &&
    view()?.nominationDeadline == null;
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

  const timestamp = (at: number) =>
    new Date(at).toLocaleTimeString(i18n.lang(), {
      hour: '2-digit',
      minute: '2-digit',
    });

  function sendChat(): void {
    if (chatLocked()) return;
    game.sendChat(chatDraft());
    setChatDraft('');
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
          <div class={styles.layout}>
            <header class={styles.topBar}>
              <span class={styles.roomName}>{state().name}</span>
              <button
                type="button"
                class={styles.menuButton}
                aria-label={formatMessage('game.infoTitle')}
                onClick={() => setInfoOpen(true)}
              >
                <Icon name="info" size={19} />
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

              <PolicyBoard board={state().board} formatMessage={formatMessage} />
            </section>

            <Show when={inNomination() && !iAmPresident() && !!game.you()?.isAlive}>
              <p class={styles.hint}>
                {formatMessage('game.nominateWaiting', {
                  name: playerName(state().board.president),
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
                  name: playerName(state().board.chancellor),
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
                            name: playerName(state().board.president),
                          })
                        : formatMessage('game.chancellorChoosing', {
                            name: playerName(state().board.chancellor),
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

            <section class={styles.chatPanel}>
              <div class={styles.tabs}>
                <button
                  type="button"
                  classList={{
                    [styles.tab]: true,
                    [styles.tabActive]: activeTab() === 'chat',
                  }}
                  onClick={() => setActiveTab('chat')}
                >
                  {formatMessage('game.chat')}
                </button>
                <button
                  type="button"
                  classList={{
                    [styles.tab]: true,
                    [styles.tabActive]: activeTab() === 'log',
                  }}
                  onClick={() => setActiveTab('log')}
                >
                  {formatMessage('game.gameLog')}
                </button>
              </div>

              <div class={styles.feed} ref={chatScroller}>
                <Show
                  when={activeTab() === 'chat'}
                  fallback={
                    <For each={game.logEntries()}>
                      {(entry) => (
                        <p class={styles.logEntry}>
                          <span class={styles.time}>{timestamp(entry.at)}</span>
                          {formatMessage(`log.${entry.code}`, entry.params)}
                        </p>
                      )}
                    </For>
                  }
                >
                  <For each={game.chatMessages()}>
                    {(message) => (
                      <p class={styles.chatMessage}>
                        <span class={styles.chatAuthor}>{message.name}</span>
                        <span class={styles.time}>{timestamp(message.at)}</span>
                        <span class={styles.chatText}>{message.text}</span>
                      </p>
                    )}
                  </For>
                </Show>
              </div>

              <Show when={activeTab() === 'chat'}>
                <Show when={inDiscussion()}>
                  <div
                    classList={{
                      [styles.speakerBar]: true,
                      [styles.speakerMine]: isMySpeakingTurn(),
                    }}
                  >
                    <span>
                      {isMySpeakingTurn()
                        ? formatMessage('game.yourTurn')
                        : formatMessage('game.speakingNow', {
                            name: playerName(speaker()!.playerId),
                          })}
                    </span>
                    <Show when={isMySpeakingTurn()}>
                      <button
                        type="button"
                        class={styles.speakerEnd}
                        onClick={sendEndTurn}
                      >
                        {formatMessage('game.endTurn')}
                      </button>
                    </Show>
                  </div>
                </Show>
                <div class={styles.chatComposer}>
                  <textarea
                    class={styles.chatInput}
                    rows={2}
                    value={chatDraft()}
                    disabled={chatLocked()}
                    placeholder={formatMessage(
                      chatLocked() ? 'game.chatWaitTurn' : 'game.chatPlaceholder',
                    )}
                    maxlength={500}
                    onInput={(event) => setChatDraft(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      // Enter sends; Shift+Enter inserts a newline.
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendChat();
                      }
                    }}
                  />
                  <button
                    type="button"
                    class={styles.chatSend}
                    aria-label={formatMessage('game.send')}
                    disabled={chatLocked()}
                    onClick={sendChat}
                  >
                    <Icon name="chat" size={20} />
                  </button>
                </div>
              </Show>
            </section>

            <PlayersModal
              open={playersOpen()}
              players={state().players}
              youId={state().you.id}
              formatMessage={formatMessage}
              canNominate={() => false}
              onNominate={() => {}}
              onClose={() => setPlayersOpen(false)}
            />

            <InfoPanel
              open={infoOpen()}
              formatMessage={formatMessage}
              onClose={() => setInfoOpen(false)}
              rows={[
                {
                  label: formatMessage('game.status'),
                  value: formatMessage(`phase.${state().phase}`),
                },
                {
                  label: formatMessage('game.currentTurn'),
                  value: speakerPlayer()?.name ?? formatMessage('game.none'),
                },
                {
                  label: formatMessage('game.electionTracker'),
                  value: `${state().board.electionTracker}/3`,
                },
                {
                  label: formatMessage('game.president'),
                  value: playerName(state().board.president),
                },
                {
                  label: formatMessage('game.chancellor'),
                  value: playerName(state().board.chancellor),
                },
              ]}
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
