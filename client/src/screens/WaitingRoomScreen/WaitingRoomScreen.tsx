import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { Phase, type GameStateView } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import {
  CONNECTION_STATUS_KEYS,
  ERROR_MESSAGE_KEYS,
  type MessageKey,
} from '../../i18n';
import { Button } from '../../components/Button/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import styles from './WaitingRoomScreen.module.scss';

const TIP_KEYS: MessageKey[] = ['tip.watch', 'tip.numbers', 'tip.hitler'];
const TIP_ROTATION_MS = 5000;

/**
 * Lobby for a joined room. The host sees the room info, the live player list
 * and the start button; guests see a join-progress ring and rotating tips.
 * Navigates to the game board as soon as the server leaves the lobby phase.
 */
export function WaitingRoomScreen() {
  const { nav, game, socket, i18n } = useApp();
  const { formatMessage } = i18n;

  const [copied, setCopied] = createSignal(false);
  const [confirmingLeave, setConfirmingLeave] = createSignal(false);

  const view = game.view;
  const shareLink = () =>
    game.currentSession()?.shareLink ??
    `${location.origin}/join/${view()?.code ?? ''}`;
  const missingCount = () => {
    const state = view();
    return state ? Math.max(0, state.minPlayers - state.players.length) : 0;
  };

  // Session dropped (left room / token expired) → back to the play menu.
  createEffect(() => {
    if (!game.inRoom()) nav.navigate('play');
  });

  // Host pressed start → server flips the phase → everyone moves to the board.
  createEffect(() => {
    const phase = view()?.phase;
    if (phase && phase !== Phase.Lobby) {
      game.clearError(); // don't carry a lobby error into the game
      nav.navigate('game');
    }
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
    setConfirmingLeave(false);
    game.leaveRoom();
    nav.navigate('play');
  }

  return (
    <Screen>
      <ScreenHeader title={formatMessage('waiting.title')} />

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
            <Show when={game.isHost()} fallback={<GuestView state={state()} />}>
              <HostView state={state()} />
            </Show>

            <Show when={game.lastError()}>
              <p class={styles.error} onClick={() => game.clearError()}>
                {formatMessage(ERROR_MESSAGE_KEYS[game.lastError()!.code])}
              </p>
            </Show>

            <button
              type="button"
              class={styles.leave}
              onClick={() => setConfirmingLeave(true)}
            >
              {formatMessage('waiting.leaveRoom')}
            </button>

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
          </>
        )}
      </Show>
    </Screen>
  );

  // --- Host: room info, share, player list, start --------------------------

  function HostView(props: { state: GameStateView }) {
    return (
      <>
        <div class={styles.infoCard}>
          <div class={styles.infoColumn}>
            <span class={styles.infoLabel}>
              {formatMessage('waiting.roomName')}
            </span>
            <span class={styles.infoValue}>{props.state.name}</span>
          </div>
          <div classList={{ [styles.infoColumn]: true, [styles.infoEnd]: true }}>
            <span class={styles.infoLabel}>
              {formatMessage('waiting.playersSection')}
            </span>
            <span class={styles.infoCount}>
              {formatMessage('waiting.playerCount', {
                count: props.state.players.length,
                max: props.state.maxPlayers,
              })}
            </span>
          </div>
        </div>

        <div class={styles.infoCard}>
          <div class={styles.infoColumn}>
            <span class={styles.infoLabel}>
              {formatMessage('waiting.roomCode')}
            </span>
            <span class={styles.code}>{props.state.code}</span>
          </div>
          <button
            type="button"
            classList={{
              [styles.infoColumn]: true,
              [styles.infoEnd]: true,
              [styles.shareButton]: true,
            }}
            onClick={copyShareLink}
          >
            <span class={styles.infoLabel}>
              {formatMessage(copied() ? 'waiting.copied' : 'waiting.shareLink')}
            </span>
            <span class={styles.shareRow}>
              <span class={styles.shareLink}>{shareLink()}</span>
              <Icon name="share" size={16} />
            </span>
          </button>
        </div>

        <div class={styles.playersHeading}>
          <span>{formatMessage('waiting.playersSection')}</span>
          <span class={styles.playersHeadingCount}>
            {formatMessage('waiting.playerCount', {
              count: props.state.players.length,
              max: props.state.maxPlayers,
            })}
          </span>
        </div>

        <ul class={styles.players}>
          <For each={[...props.state.players].sort((a, b) => a.seat - b.seat)}>
            {(player) => (
              <li
                classList={{
                  [styles.player]: true,
                  [styles.you]: player.id === props.state.you.id,
                  [styles.offline]: !player.connected,
                }}
              >
                <span class={styles.avatar}>
                  {player.name.slice(0, 1).toUpperCase()}
                </span>
                <span class={styles.playerName}>
                  {player.name}
                  <Show when={player.isHost}>
                    <Icon name="crown" size={14} class={styles.crown} />
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

        <Show when={missingCount() > 0}>
          <p class={styles.note}>
            {formatMessage('waiting.needMore', { count: missingCount() })}
          </p>
        </Show>

        <div class={styles.startWrap}>
          <Button
            size="lg"
            disabled={!game.canStart()}
            onClick={() => game.startGame()}
          >
            {formatMessage('waiting.startGame')}
          </Button>
        </div>
      </>
    );
  }

  // --- Guest: progress ring + rotating tips ---------------------------------

  function GuestView(props: { state: GameStateView }) {
    const [tipIndex, setTipIndex] = createSignal(0);

    onMount(() => {
      const timer = setInterval(
        () => setTipIndex((index) => (index + 1) % TIP_KEYS.length),
        TIP_ROTATION_MS,
      );
      onCleanup(() => clearInterval(timer));
    });

    const progress = () => props.state.players.length / props.state.maxPlayers;
    const amReady = () => game.you()?.ready ?? false;

    return (
      <div class={styles.guest}>
        <p class={styles.waitingText}>{formatMessage('waiting.waitingToJoin')}</p>
        <p class={styles.guestCount}>
          {formatMessage('waiting.playerCount', {
            count: props.state.players.length,
            max: props.state.maxPlayers,
          })}
        </p>

        <ProgressRing progress={progress()} />

        <Button
          size="lg"
          variant={amReady() ? 'outline' : 'gold'}
          onClick={() => game.setReady(!amReady())}
        >
          {formatMessage(amReady() ? 'waiting.notReadyYet' : 'waiting.imReady')}
        </Button>

        <div class={styles.tips}>
          <div class={styles.tipsHeading}>
            <Icon name="masks" size={20} />
          </div>
          <p class={styles.tipText}>{formatMessage(TIP_KEYS[tipIndex()])}</p>
          <div class={styles.dots}>
            <For each={TIP_KEYS}>
              {(_, index) => (
                <span
                  classList={{
                    [styles.dot]: true,
                    [styles.dotActive]: index() === tipIndex(),
                  }}
                />
              )}
            </For>
          </div>
        </div>

        <p class={styles.note}>{formatMessage('waiting.autoStartGuestNote')}</p>
      </div>
    );
  }
}

/** Gold arc showing how full the room is, with the capitol in the middle. */
function ProgressRing(props: { progress: number }) {
  const RADIUS = 84;
  const circumference = 2 * Math.PI * RADIUS;
  return (
    <div class={styles.ringWrap}>
      <svg class={styles.ring} viewBox="0 0 200 200" aria-hidden="true">
        <circle class={styles.ringTrack} cx="100" cy="100" r={RADIUS} />
        <circle
          class={styles.ringValue}
          cx="100"
          cy="100"
          r={RADIUS}
          stroke-dasharray={`${circumference * props.progress} ${circumference}`}
        />
      </svg>
      <Icon name="capitol" size={72} class={styles.ringIcon} />
    </div>
  );
}
