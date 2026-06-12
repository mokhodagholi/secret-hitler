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
import { TurnBanner } from './TurnBanner';
import { PlayersModal } from './PlayersModal';
import { GameMenu } from './GameMenu';
import { LegislativeModal } from './LegislativeModal';
import { VotingOverlay } from './VotingOverlay';
import { PowerPanel } from './PowerPanel';
import { GameOverOverlay } from './GameOverOverlay';
import { PolicyRevealOverlay } from './PolicyRevealOverlay';
import styles from './GameScreen.module.scss';

/**
 * Main game screen: header with the in-game menu, the full-width policy board
 * (your role banner, draw/discard stacks, tracks, player-count chip), the
 * phase action panel and a full-width chat. State is the server's; this screen
 * renders the latest GameStateView and sends commands back.
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
    // A failed election jolts the board (a reset to 0 is not a failure).
    if (tracker > previousTracker) void animation.play(boardElement, 'shake');
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

  // Whichever phase clock is running right now, for the compact status row.
  const activeDeadline = () =>
    view()?.voteDeadline ?? view()?.legislativeDeadline ?? speaker();
  const activeSecondsLeft = () => {
    const deadline = activeDeadline();
    return deadline
      ? Math.max(0, Math.ceil((deadline.endsAt - now()) / 1000))
      : null;
  };

  function castVote(vote: 'ja' | 'nein'): void {
    game.sendCommand({ kind: 'castVote', vote });
  }

  function endSpeakingTurn(): void {
    game.sendCommand({ kind: 'endTurn' });
  }

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

              <Show when={speakerPlayer()}>
                {(player) => (
                  <TurnBanner
                    speakerId={player().id}
                    name={player().name}
                    avatar={player().avatar}
                    isMyTurn={isMySpeakingTurn()}
                    onEndTurn={endSpeakingTurn}
                    formatMessage={formatMessage}
                  />
                )}
              </Show>

              <PolicyBoard board={state().board} formatMessage={formatMessage} />

              <div class={styles.government}>
                <div class={styles.governmentCard}>
                  <span class={styles.governmentLabel}>
                    {formatMessage('game.president')}
                  </span>
                  <span class={styles.governmentName}>
                    {playerName(state().board.president)}
                  </span>
                </div>
                <div class={styles.governmentCard}>
                  <span class={styles.governmentLabel}>
                    {formatMessage('game.chancellor')}
                  </span>
                  <span class={styles.governmentName}>
                    {playerName(state().board.chancellor)}
                  </span>
                </div>
              </div>
            </section>

            <Show when={state().phase === Phase.Nomination && iAmPresident()}>
              <p class={styles.hint}>{formatMessage('game.nominateHint')}</p>
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
              canNominate={canNominate}
              onNominate={nominate}
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
