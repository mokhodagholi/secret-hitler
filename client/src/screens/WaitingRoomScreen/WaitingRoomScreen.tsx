import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { MAX_PLAYERS, Phase, miniAppStartLink, DEFAULT_BALE_BOT_USERNAME, type GameStateView } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import {
  CONNECTION_STATUS_KEYS,
  ERROR_MESSAGE_KEYS,
  type MessageKey,
} from '../../i18n';
import { Button } from '../../components/Button/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { PlayerSlot } from './PlayerSlot';
import styles from './WaitingRoomScreen.module.scss';

const TIP_KEYS: MessageKey[] = ['tip.watch', 'tip.numbers', 'tip.hitler'];
const TIP_ROTATION_MS = 5000;

/**
 * Lobby for a joined room. Paper profile cards sit in a row over the
 * briefing-desk art; a rotating tip and the room controls sit at the bottom.
 * Navigates to the game board as soon as the server leaves the lobby phase.
 */
export function WaitingRoomScreen() {
  const { nav, game, socket, i18n, animation, sound } = useApp();
  const { formatMessage } = i18n;

  const [copied, setCopied] = createSignal(false);
  const [confirmingLeave, setConfirmingLeave] = createSignal(false);
  const [startOpen, setStartOpen] = createSignal(false);
  const [kickTarget, setKickTarget] = createSignal<{
    id: string;
    name: string;
  } | null>(null);
  const [tipIndex, setTipIndex] = createSignal(0);
  let tipEl: HTMLParagraphElement | undefined;

  const view = game.view;
  const shareLink = () => miniAppStartLink(DEFAULT_BALE_BOT_USERNAME, view()?.code ?? '');
  const amReady = () => game.you()?.ready ?? false;

  // Session dropped (left room / token expired) → back to the play menu.
  createEffect(() => {
    if (!game.inRoom()) nav.returnTo('play');
  });

  // Host pressed start → server flips the phase → everyone moves to the board.
  createEffect(() => {
    const phase = view()?.phase;
    if (phase && phase !== Phase.Lobby) {
      sound.play('room-start');
      game.clearError(); // don't carry a lobby error into the game
      nav.navigate('game');
    }
  });

  let seenPlayerIds: Set<string> | null = null;
  let lastReadyCount = -1;
  createEffect(() => {
    const state = view();
    if (!state) return;
    const ids = new Set(state.players.map((player) => player.id));
    const readyCount = state.players.filter((player) => player.ready).length;
    if (seenPlayerIds == null) {
      seenPlayerIds = ids;
      lastReadyCount = readyCount;
      return;
    }
    for (const id of ids) {
      if (!seenPlayerIds.has(id)) sound.play('player-join');
    }
    for (const id of seenPlayerIds) {
      if (!ids.has(id)) sound.play('player-leave');
    }
    if (readyCount > lastReadyCount) sound.play('player-ready');
    seenPlayerIds = ids;
    lastReadyCount = readyCount;
  });

  onMount(() => {
    const timer = setInterval(
      () => setTipIndex((index) => (index + 1) % TIP_KEYS.length),
      TIP_ROTATION_MS,
    );
    onCleanup(() => clearInterval(timer));
  });

  createEffect((previous: number | undefined) => {
    const index = tipIndex();
    if (previous !== undefined && tipEl) void animation.play(tipEl, 'fade-in');
    return index;
  });

  async function copyShareLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareLink());
      sound.play('ui-copied');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — nothing to do.
    }
  }

  function leaveRoom(): void {
    setConfirmingLeave(false);
    game.leaveRoom();
    nav.returnTo('play');
  }

  function tryStart(): void {
    const state = view();
    if (!state) return;
    const connected = state.players.filter((player) => player.connected);
    if (
      connected.length < state.minPlayers ||
      !connected.every((player) => player.ready)
    ) {
      sound.play('ui-error');
    }
    setStartOpen(true);
  }

  function confirmStart(): void {
    setStartOpen(false);
    game.startGame();
  }

  const startConnected = () => {
    const state = view();
    if (!state) return [];
    return state.players.filter((player) => player.connected);
  };

  const startConnectedCount = () => startConnected().length;

  const startNeedCount = () => {
    const state = view();
    if (!state) return 0;
    return Math.max(0, state.minPlayers - startConnectedCount());
  };

  const unreadyPlayers = () =>
    startConnected().filter((player) => !player.ready);

  const startGate = (): 'needPlayers' | 'notReady' | 'confirm' | null => {
    if (!startOpen()) return null;
    const state = view();
    if (!state) return null;
    const connected = startConnected();
    if (connected.length < state.minPlayers) return 'needPlayers';
    if (unreadyPlayers().length > 0) return 'notReady';
    return 'confirm';
  };

  return (
    <Screen fill>
      <div class={styles.scene}>
        <div class={styles.backdrop} aria-hidden="true" />

        <ScreenHeader
          title={formatMessage('waiting.title')}
          tone="warm"
          onBack={() => setConfirmingLeave((open) => !open)}
        />

        <Show
          when={view()}
          fallback={
            <p class={styles.note}>
              {formatMessage(CONNECTION_STATUS_KEYS[socket.status()])}
            </p>
          }
        >
          {(state) => (
            <>
              <SeatBoard state={state()} />

              <footer class={styles.footer}>
                <p class={styles.tip} ref={(element) => (tipEl = element)}>
                  {formatMessage(TIP_KEYS[tipIndex()])}
                </p>

                <Show when={game.lastError()}>
                  <p class={styles.error} onClick={() => game.clearError()}>
                    {formatMessage(ERROR_MESSAGE_KEYS[game.lastError()!.code])}
                  </p>
                </Show>

                <div class={styles.actions}>
                  <Button variant="outline" onClick={copyShareLink}>
                    {formatMessage(copied() ? 'waiting.copied' : 'waiting.shareLink')}
                  </Button>

                  <Show
                    when={game.isHost()}
                    fallback={
                      <Button
                        variant={amReady() ? 'outline' : 'gold'}
                        onClick={() => game.setReady(!amReady())}
                      >
                        {formatMessage(
                          amReady() ? 'waiting.notReadyYet' : 'waiting.imReady',
                        )}
                      </Button>
                    }
                  >
                    <Button onClick={tryStart}>
                      {formatMessage('waiting.startGame')}
                    </Button>
                  </Show>

                  <Button variant="danger" onClick={() => setConfirmingLeave(true)}>
                    {formatMessage('waiting.leaveRoom')}
                  </Button>
                </div>
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

              <ConfirmDialog
                open={startGate() === 'needPlayers'}
                message={formatMessage('waiting.startNeedPlayers', {
                  current: startConnectedCount(),
                  count: startNeedCount(),
                })}
                confirmLabel={formatMessage('common.ok')}
                onConfirm={() => setStartOpen(false)}
                onCancel={() => setStartOpen(false)}
              />

              <ConfirmDialog
                open={startGate() === 'confirm'}
                message={formatMessage('waiting.startConfirm', {
                  count: startConnectedCount(),
                })}
                confirmLabel={formatMessage('waiting.startGame')}
                cancelLabel={formatMessage('common.cancel')}
                onConfirm={confirmStart}
                onCancel={() => setStartOpen(false)}
              />

              <ConfirmDialog
                open={startGate() === 'notReady'}
                message={formatMessage('waiting.startNotReady')}
                confirmLabel={formatMessage('common.ok')}
                onConfirm={() => setStartOpen(false)}
                onCancel={() => setStartOpen(false)}
              >
                <div class={styles.unreadyList}>
                  <For each={unreadyPlayers()}>
                    {(player) => (
                      <div class={styles.unreadyRow}>
                        <div class={styles.unreadyPortrait}>
                          <PlayerSlot
                            player={{
                              name: player.name,
                              avatar: player.avatar,
                              seat: player.seat,
                              ready: player.ready,
                              connected: player.connected,
                            }}
                            awaitingLabel={formatMessage(
                              'waiting.waitingForPlayers',
                            )}
                            seatLabel={formatMessage('waiting.seatLabel', {
                              n: player.seat + 1,
                            })}
                            compact
                          />
                        </div>
                        <Button
                          variant="danger"
                          onClick={() =>
                            setKickTarget({ id: player.id, name: player.name })
                          }
                        >
                          {formatMessage('waiting.kickNamed', {
                            name: player.name,
                          })}
                        </Button>
                      </div>
                    )}
                  </For>
                </div>
              </ConfirmDialog>

              <ConfirmDialog
                open={kickTarget() != null}
                message={formatMessage('waiting.kickConfirm', {
                  name: kickTarget()?.name ?? '',
                })}
                confirmLabel={formatMessage('waiting.kick')}
                cancelLabel={formatMessage('common.cancel')}
                onConfirm={() => {
                  const target = kickTarget();
                  if (target) game.kickPlayer(target.id);
                  setKickTarget(null);
                }}
                onCancel={() => setKickTarget(null)}
              />
            </>
          )}
        </Show>
      </div>
    </Screen>
  );

  // --- Player seats, filled then empty (grayed) up to capacity ---------------

  function SeatBoard(props: { state: GameStateView }) {
    const seated = createMemo(() =>
      [...props.state.players].sort((a, b) => a.seat - b.seat),
    );
    const awaiting = createMemo(() =>
      Math.max(0, props.state.maxPlayers - seated().length),
    );
    const compact = () => props.state.maxPlayers === MAX_PLAYERS;

    return (
      <div
        classList={{
          [styles.seats]: true,
          [styles.seatsPacked]: compact(),
        }}
        role="list"
      >
        <For each={seated()}>
          {(player) => (
            <PlayerSlot
              player={{
                name: player.name,
                avatar: player.avatar,
                seat: player.seat,
                ready: player.ready,
                connected: player.connected,
              }}
              awaitingLabel={formatMessage('waiting.waitingForPlayers')}
              seatLabel={formatMessage('waiting.seatLabel', {
                n: player.seat + 1,
              })}
              isYou={player.id === props.state.you.id}
              youLabel={formatMessage('game.you')}
              compact={compact()}
              onSelect={
                game.isHost() && player.id !== props.state.you.id
                  ? () => setKickTarget({ id: player.id, name: player.name })
                  : undefined
              }
            />
          )}
        </For>
        <For each={Array.from({ length: awaiting() })}>
          {() => (
            <PlayerSlot
              awaitingLabel={formatMessage('waiting.waitingForPlayers')}
              compact={compact()}
            />
          )}
        </For>
      </div>
    );
  }
}
