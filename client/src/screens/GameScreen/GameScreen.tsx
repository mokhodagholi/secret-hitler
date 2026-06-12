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
import { CONNECTION_STATUS_KEYS, ERROR_MESSAGE_KEYS } from '../../i18n';
import { BoardRenderer } from '../../canvas/BoardRenderer';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { PlayerSeat } from './PlayerSeat';
import { VotingOverlay } from './VotingOverlay';
import { PowerPanel } from './PowerPanel';
import { PolicyRevealOverlay } from './PolicyRevealOverlay';
import styles from './GameScreen.module.scss';

/**
 * Main game board: players around the wooden table, the canvas policy board,
 * president/chancellor cards, chat/log panel beside the role column, and the
 * phase action footer. State is the server's; this screen renders the latest
 * GameStateView and sends commands back.
 */
export function GameScreen() {
  const { nav, game, socket, i18n, settings, animation } = useApp();
  const { formatMessage } = i18n;
  const showTimer = () => settings.settings.timerEnabled;

  const view = game.view;
  const [activeTab, setActiveTab] = createSignal<'chat' | 'log'>('chat');
  const [chatDraft, setChatDraft] = createSignal('');
  const [confirmingLeave, setConfirmingLeave] = createSignal(false);
  const [now, setNow] = createSignal(Date.now());

  let boardCanvas!: HTMLCanvasElement;
  let chatScroller: HTMLDivElement | undefined;
  let renderer: BoardRenderer | undefined;

  // Session dropped (left / expired) → back to the play menu.
  createEffect(() => {
    if (!game.inRoom()) nav.navigate('play');
  });

  onMount(() => {
    const ticker = setInterval(() => setNow(Date.now()), 500);
    onCleanup(() => {
      renderer?.dispose();
      clearInterval(ticker);
    });
  });

  const speaker = () => view()?.speaker ?? null;
  const isMySpeakingTurn = () => {
    const state = view();
    return state?.speaker?.playerId === state?.you.id;
  };
  const secondsLeft = () => {
    const current = speaker();
    return current ? Math.max(0, Math.ceil((current.endsAt - now()) / 1000)) : 0;
  };
  const chatLocked = () => speaker() != null && !isMySpeakingTurn();

  // Redraw the canvas whenever board state or language changes. The canvas
  // lives inside <Show when={view()}>, so the renderer is created lazily the
  // first time a board (and therefore the canvas element) actually exists.
  createEffect(() => {
    const board = view()?.board;
    if (!board) return;
    if (!renderer && boardCanvas) renderer = new BoardRenderer(boardCanvas);
    renderer?.render(board, {
      liberal: formatMessage('game.liberal'),
      fascist: formatMessage('game.fascist'),
      draw: formatMessage('game.drawPile'),
      discard: formatMessage('game.discardPile'),
      currentTrack: formatMessage('game.currentTrack'),
    });
  });

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
  let seenRoomId: string | null = null;

  createEffect(() => {
    const state = view();
    if (!state) {
      seenPolicyTotal = null;
      seenRoomId = null;
      return;
    }
    const total = state.board.liberalPolicies + state.board.fascistPolicies;
    if (state.roomId !== seenRoomId) {
      // First snapshot of a room (join/rejoin) — baseline, don't replay history.
      seenRoomId = state.roomId;
      seenPolicyTotal = total;
      return;
    }
    const previousTotal = seenPolicyTotal ?? total;
    seenPolicyTotal = total;
    const latest = state.board.lastEnacted[state.board.lastEnacted.length - 1];
    if (total > previousTotal && latest) revealEnactedPolicy(latest);
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

  const voters = () =>
    view()?.players.filter((player) => player.isAlive && player.connected) ?? [];
  const votedCount = () => voters().filter((player) => player.hasVoted).length;
  const voteSecondsLeft = () => {
    const deadline = view()?.voteDeadline;
    return deadline ? Math.max(0, Math.ceil((deadline.endsAt - now()) / 1000)) : 0;
  };
  const voteProgress = () =>
    Math.max(0, Math.min(1, (voteSecondsLeft() * 1000) / VOTE_DURATION_MS));

  function castVote(vote: 'ja' | 'nein'): void {
    game.sendCommand({ kind: 'castVote', vote });
  }

  const isLegislative = () => {
    const phase = view()?.phase;
    return (
      phase === Phase.PresidentLegislative ||
      phase === Phase.ChancellorLegislative
    );
  };
  const myPolicies = () => view()?.you.policies ?? [];

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

  /** Seat centre on the table ellipse — seat 0 at the top, clockwise. */
  const seatPosition = (seatIndex: number, seatCount: number) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * seatIndex) / seatCount;
    return {
      x: 50 + 43 * Math.cos(angle),
      y: 50 + 42 * Math.sin(angle),
    };
  };

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
            <div class={styles.roomBar}>
              <span class={styles.roomName}>
                {formatMessage('game.roomLabel', { name: state().name })}
              </span>
              <span class={styles.roomCount}>
                <Icon name="people" size={15} />
                {formatMessage('waiting.playerCount', {
                  count: state().players.length,
                  max: state().maxPlayers,
                })}
              </span>
              <span
                classList={{
                  [styles.connection]: true,
                  [styles.connected]: socket.status() === 'connected',
                }}
                title={formatMessage(CONNECTION_STATUS_KEYS[socket.status()])}
              />
            </div>

            <div class={styles.table}>
              <For each={state().players}>
                {(player) => {
                  const position = seatPosition(
                    player.seat,
                    state().players.length,
                  );
                  return (
                    <PlayerSeat
                      player={player}
                      x={position.x}
                      y={position.y}
                      isYou={player.id === state().you.id}
                      speaking={player.id === state().speaker?.playerId}
                      nominatable={canNominate(player)}
                      onNominate={() =>
                        game.sendCommand({
                          kind: 'nominateChancellor',
                          targetId: player.id,
                        })
                      }
                      formatMessage={formatMessage}
                    />
                  );
                }}
              </For>
              <canvas ref={boardCanvas} class={styles.board} />
            </div>

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

            <Show when={isLegislative()}>
              <div class={styles.votePanel}>
                <Show
                  when={state().vetoRequested}
                  fallback={
                    <Show
                      when={myPolicies().length > 0}
                      fallback={
                        <span class={styles.voteWaiting}>
                          {state().phase === Phase.PresidentLegislative
                            ? formatMessage('game.presidentChoosing', {
                                name: playerName(state().board.president),
                              })
                            : formatMessage('game.chancellorChoosing', {
                                name: playerName(state().board.chancellor),
                              })}
                        </span>
                      }
                    >
                      <span class={styles.votePrompt}>
                        {formatMessage(
                          state().phase === Phase.PresidentLegislative
                            ? 'game.presidentDiscardHint'
                            : 'game.chancellorEnactHint',
                        )}
                      </span>
                      <div class={styles.policyCards}>
                        <For each={myPolicies()}>
                          {(policy, index) => (
                            <button
                              type="button"
                              classList={{
                                [styles.policyCard]: true,
                                [styles.policyLiberal]: policy === 'liberal',
                                [styles.policyFascist]: policy === 'fascist',
                              }}
                              onClick={() => chooseLegislative(index())}
                            >
                              {formatMessage(`game.${policy}`)}
                            </button>
                          )}
                        </For>
                      </div>
                      <Show
                        when={
                          state().phase === Phase.ChancellorLegislative &&
                          state().vetoUnlocked &&
                          iAmChancellor()
                        }
                      >
                        <button
                          type="button"
                          class={styles.vetoButton}
                          onClick={proposeVeto}
                        >
                          {formatMessage('game.veto.propose')}
                        </button>
                      </Show>
                    </Show>
                  }
                >
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
                </Show>
              </div>
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

            <div class={styles.panels}>
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
                            {entry.text}
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
                  <Show when={speaker()}>
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
                      <Show when={showTimer()}>
                        <span class={styles.speakerTimer}>
                          {formatMessage('game.secondsLeft', {
                            seconds: secondsLeft(),
                          })}
                        </span>
                      </Show>
                    </div>
                  </Show>
                  <div class={styles.chatComposer}>
                    <input
                      class={styles.chatInput}
                      value={chatDraft()}
                      disabled={chatLocked()}
                      placeholder={formatMessage(
                        chatLocked() ? 'game.chatWaitTurn' : 'game.chatPlaceholder',
                      )}
                      maxlength={500}
                      onInput={(event) => setChatDraft(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') sendChat();
                      }}
                    />
                    <button
                      type="button"
                      class={styles.chatSend}
                      aria-label={formatMessage('game.send')}
                      disabled={chatLocked()}
                      onClick={sendChat}
                    >
                      <Icon name="chat" size={18} />
                    </button>
                  </div>
                </Show>
              </section>

              <div class={styles.sideColumn}>
                <Show when={game.role()}>
                  <section
                    class={styles.roleCard}
                    ref={(element) => void animation.play(element, 'card-flip-in')}
                  >
                    <span class={styles.panelHeading}>
                      {formatMessage('game.yourRole')}
                    </span>
                    <span
                      classList={{
                        [styles.roleName]: true,
                        [styles.roleLiberal]: game.role() === 'liberal',
                        [styles.roleFascist]: game.role() !== 'liberal',
                      }}
                    >
                      {formatMessage(`role.${game.role()!}`)}
                    </span>
                    <span class={styles.roleDescription}>
                      {formatMessage(`roleDescription.${game.role()!}`)}
                    </span>
                  </section>
                </Show>
              </div>
            </div>

            <footer class={styles.footer}>
              <button
                type="button"
                class={styles.leave}
                onClick={() => setConfirmingLeave(true)}
              >
                {formatMessage('game.leaveRoom')}
              </button>

              {/* Phase actions arrive with the game engine — visual stub. */}
              <button type="button" class={styles.endTurn} disabled>
                <span class={styles.endTurnLabel}>
                  {formatMessage('game.endTurn')}
                </span>
                <Show when={iAmPresident()}>
                  <span class={styles.endTurnSub}>
                    {formatMessage('game.youArePresident')}
                  </span>
                </Show>
              </button>

              <button
                type="button"
                class={styles.rules}
                onClick={() => nav.navigate('rules')}
              >
                {formatMessage('game.viewRules')}
              </button>
            </footer>

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
          </div>
        )}
      </Show>
    </Screen>
  );
}
