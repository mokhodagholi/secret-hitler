import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { Phase, type PublicPlayer } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import type { MessageKey } from '../../i18n';
import { BoardRenderer } from '../../canvas/BoardRenderer';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { PlayerSeat } from './PlayerSeat';
import styles from './GameScreen.module.scss';

/**
 * Main game board: players around the oval table, the canvas policy board,
 * the viewer's role card, chat / game-log tabs and a phase-contextual action
 * area. All state is the server's — this screen renders the latest
 * GameStateView and sends commands back.
 */
export function GameScreen() {
  const { nav, game, socket, i18n } = useApp();
  const { formatMessage } = i18n;

  const view = game.view;
  const [activeTab, setActiveTab] = createSignal<'chat' | 'log'>('chat');
  const [chatDraft, setChatDraft] = createSignal('');

  let boardCanvas!: HTMLCanvasElement;
  let chatScroller: HTMLDivElement | undefined;
  let renderer: BoardRenderer | undefined;

  // Session dropped (left / expired) → back to the play menu.
  createEffect(() => {
    if (!game.inRoom()) nav.navigate('play');
  });

  onMount(() => {
    renderer = new BoardRenderer(boardCanvas);
    onCleanup(() => renderer?.dispose());
  });

  // Redraw the canvas whenever board state or language changes.
  createEffect(() => {
    const board = view()?.board;
    if (!board || !renderer) return;
    renderer.render(board, {
      liberal: formatMessage('game.liberal'),
      fascist: formatMessage('game.fascist'),
      draw: formatMessage('game.drawPile'),
      discard: formatMessage('game.discardPile'),
    });
  });

  // Keep the chat pinned to the newest message.
  createEffect(() => {
    game.chatMessages();
    game.logEntries();
    if (chatScroller) chatScroller.scrollTop = chatScroller.scrollHeight;
  });

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
      player.id !== state.you.id
    );
  };

  /** Seat centre on the table ellipse — seat 0 at the top, clockwise. */
  const seatPosition = (seatIndex: number, seatCount: number) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * seatIndex) / seatCount;
    return {
      x: 50 + 42 * Math.cos(angle),
      y: 50 + 40 * Math.sin(angle),
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
    game.sendChat(chatDraft());
    setChatDraft('');
  }

  function leaveRoom(): void {
    game.leaveRoom();
    nav.navigate('play');
  }

  return (
    <Screen>
      <Show when={view()}>
        {(state) => (
          <div class={styles.layout}>
            <header class={styles.header}>
              <div class={styles.headerText}>
                <span class={styles.roomName}>{state().name}</span>
                <span class={styles.phase}>
                  {formatMessage(`phase.${state().phase}` as MessageKey)}
                </span>
              </div>
              <span
                classList={{
                  [styles.connection]: true,
                  [styles.connected]: socket.status() === 'connected',
                }}
                title={formatMessage(
                  `connection.${socket.status()}` as MessageKey,
                )}
              />
            </header>

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
              <span>
                {formatMessage('game.president')}:{' '}
                <strong>{playerName(state().board.president)}</strong>
              </span>
              <span>
                {formatMessage('game.chancellor')}:{' '}
                <strong>{playerName(state().board.chancellor)}</strong>
              </span>
            </div>

            <Show when={state().phase === Phase.Nomination && iAmPresident()}>
              <p class={styles.hint}>{formatMessage('game.nominateHint')}</p>
            </Show>

            <Show when={game.role()}>
              <div class={styles.roleCard}>
                <span class={styles.roleLabel}>
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
              </div>
            </Show>

            <Show when={game.lastError()}>
              <p class={styles.error} onClick={() => game.clearError()}>
                {formatMessage(`error.${game.lastError()!.code}` as MessageKey)}
              </p>
            </Show>

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
              <div class={styles.chatComposer}>
                <input
                  class={styles.chatInput}
                  value={chatDraft()}
                  placeholder={formatMessage('game.chatPlaceholder')}
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
                  onClick={sendChat}
                >
                  <Icon name="chat" size={20} />
                </button>
              </div>
            </Show>

            <footer class={styles.footer}>
              <button type="button" class={styles.leave} onClick={leaveRoom}>
                {formatMessage('game.leaveRoom')}
              </button>
              <button
                type="button"
                class={styles.rules}
                onClick={() => nav.navigate('rules')}
              >
                {formatMessage('game.viewRules')}
              </button>
            </footer>
          </div>
        )}
      </Show>
    </Screen>
  );
}
