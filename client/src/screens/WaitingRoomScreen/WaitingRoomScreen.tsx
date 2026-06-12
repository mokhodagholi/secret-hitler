import { For, Show, createEffect, createSignal } from 'solid-js';
import { MIN_PLAYERS, Phase } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import type { MessageKey } from '../../i18n';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import styles from './WaitingRoomScreen.module.scss';

/**
 * Lobby for a joined room: code + share link, live player list with ready
 * badges, the viewer's ready toggle and the host's start button. Navigates to
 * the game board as soon as the server moves the room out of the lobby phase.
 */
export function WaitingRoomScreen() {
  const { nav, game, socket, i18n } = useApp();
  const { formatMessage } = i18n;

  const [copied, setCopied] = createSignal(false);

  const view = game.view;
  const shareLink = () =>
    game.currentSession()?.shareLink ??
    `${location.origin}/join/${view()?.code ?? ''}`;

  // Session dropped (left room / token expired) → back to the play menu.
  createEffect(() => {
    if (!game.inRoom()) nav.navigate('play');
  });

  // Host pressed start → server flips the phase → everyone moves to the board.
  createEffect(() => {
    const phase = view()?.phase;
    if (phase && phase !== Phase.Lobby) nav.navigate('game');
  });

  async function copyShareLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — nothing to do.
    }
  }

  function leaveRoom(): void {
    game.leaveRoom();
    nav.navigate('play');
  }

  return (
    <Screen>
      <ScreenHeader title={view()?.name ?? ''} />

      <Show when={view()} fallback={<ConnectionNote />}>
        {(state) => (
          <>
            <div class={styles.meta}>
              <div class={styles.codeBlock}>
                <span class={styles.metaLabel}>
                  {formatMessage('waiting.roomCode')}
                </span>
                <span class={styles.code}>{state().code}</span>
              </div>
              <div class={styles.count}>
                {formatMessage('waiting.playerCount', {
                  count: state().players.length,
                  max: state().maxPlayers,
                })}
              </div>
            </div>

            <button type="button" class={styles.share} onClick={copyShareLink}>
              <span class={styles.shareLink}>{shareLink()}</span>
              <span class={styles.copy}>
                {formatMessage(copied() ? 'waiting.copied' : 'waiting.copy')}
              </span>
            </button>

            <ul class={styles.players}>
              <For each={[...state().players].sort((a, b) => a.seat - b.seat)}>
                {(player) => (
                  <li
                    classList={{
                      [styles.player]: true,
                      [styles.offline]: !player.connected,
                    }}
                  >
                    <span class={styles.avatar}>
                      {player.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span class={styles.playerName}>
                      {player.name}
                      <Show when={player.isHost}>
                        <span class={styles.hostBadge}>
                          {formatMessage('waiting.host')}
                        </span>
                      </Show>
                    </span>
                    <span
                      classList={{
                        [styles.readyBadge]: true,
                        [styles.isReady]: player.ready,
                      }}
                    >
                      {formatMessage(
                        player.ready ? 'waiting.ready' : 'waiting.notReady',
                      )}
                    </span>
                  </li>
                )}
              </For>
            </ul>

            <Show when={game.lastError()}>
              <p class={styles.error} onClick={() => game.clearError()}>
                {formatMessage(`error.${game.lastError()!.code}` as MessageKey)}
              </p>
            </Show>

            <div class={styles.actions}>
              <Button
                variant="outline"
                onClick={() => game.setReady(!game.you()?.ready)}
              >
                {formatMessage(
                  game.you()?.ready ? 'waiting.imNotReady' : 'waiting.imReady',
                )}
              </Button>

              <Show
                when={game.isHost()}
                fallback={
                  <p class={styles.note}>
                    {formatMessage('waiting.waitingForPlayers')}
                  </p>
                }
              >
                <Button size="lg" onClick={() => game.startGame()}>
                  {formatMessage('waiting.startGame')}
                </Button>
                <Show when={!game.canStart()}>
                  <p class={styles.note}>
                    {formatMessage('waiting.autoStartNote', { min: MIN_PLAYERS })}
                  </p>
                </Show>
              </Show>

              <button type="button" class={styles.leave} onClick={leaveRoom}>
                {formatMessage('waiting.leaveRoom')}
              </button>
            </div>
          </>
        )}
      </Show>
    </Screen>
  );

  function ConnectionNote() {
    return (
      <p class={styles.note}>
        {formatMessage(`connection.${socket.status()}` as MessageKey)}
      </p>
    );
  }
}
