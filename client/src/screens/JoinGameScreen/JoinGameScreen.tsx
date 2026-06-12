import { For, Show, createEffect, createResource, createSignal } from 'solid-js';
import { Phase, type RoomSummary } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { RoomApiError } from '../../services/GameStateService';
import { ERROR_MESSAGE_KEYS, type MessageKey } from '../../i18n';
import { APP_NAV } from '../../components/BottomNav/BottomNav';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { TextInput } from '../../components/TextInput/TextInput';
import styles from './JoinGameScreen.module.scss';

/** Join Game — public room list, password entry for locked rooms. */
export function JoinGameScreen() {
  const { nav, settings, game, i18n } = useApp();
  const { formatMessage } = i18n;

  const [rooms, { refetch }] = createResource(() => game.listRooms());
  const [selectedRoomId, setSelectedRoomId] = createSignal<string | null>(null);
  // A /join/CODE share link preselects its room once the list arrives.
  const [pendingJoinCode, setPendingJoinCode] = createSignal(nav.consumeJoinCode());
  // Asked only once — afterwards the profile name from Settings is used.
  const profileMissing = settings.settings.profileName.trim().length === 0;
  const [playerName, setPlayerName] = createSignal(settings.settings.profileName);
  const [password, setPassword] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);
  const [errorKey, setErrorKey] = createSignal<MessageKey | null>(null);

  // Already seated in a room (e.g. navigated back) — return to it instead of
  // letting the same person join again as a brand-new player.
  createEffect(() => {
    if (!game.inRoom()) return;
    const phase = game.view()?.phase;
    nav.navigate(phase && phase !== Phase.Lobby ? 'game' : 'waiting-room');
  });

  createEffect(() => {
    const code = pendingJoinCode();
    const match = rooms()?.find((room) => room.code === code);
    if (!code || !rooms()) return;
    if (match && joinable(match)) setSelectedRoomId(match.id);
    setPendingJoinCode(null);
  });

  const selectedRoom = (): RoomSummary | null =>
    rooms()?.find((room) => room.id === selectedRoomId()) ?? null;

  const joinable = (room: RoomSummary) =>
    room.phase === Phase.Lobby && room.playerCount < room.maxPlayers;

  const canSubmit = () =>
    selectedRoom() != null && playerName().trim().length > 0 && !submitting();

  async function submit(): Promise<void> {
    const room = selectedRoom();
    if (!room || !canSubmit()) return;
    setSubmitting(true);
    setErrorKey(null);
    settings.set('profileName', playerName().trim());
    try {
      await game.joinRoom(room.id, {
        name: playerName().trim(),
        password: password().trim() || undefined,
      });
      nav.navigate('waiting-room');
    } catch (error) {
      const code = error instanceof RoomApiError ? error.code : 'NETWORK';
      setErrorKey(ERROR_MESSAGE_KEYS[code]);
      void refetch();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen nav={APP_NAV}>
      <ScreenHeader
        title={formatMessage('joinGame.title')}
        right={
          <button
            type="button"
            class={styles.refresh}
            aria-label={formatMessage('joinGame.refresh')}
            onClick={() => void refetch()}
          >
            <Icon name="refresh" size={20} />
          </button>
        }
      />

      <SectionTitle>{formatMessage('joinGame.availableRooms')}</SectionTitle>

      <Show
        when={(rooms() ?? []).length > 0}
        fallback={<p class={styles.empty}>{formatMessage('joinGame.noRooms')}</p>}
      >
        <ul class={styles.roomList}>
          <For each={rooms()}>
            {(room) => (
              <li>
                <button
                  type="button"
                  classList={{
                    [styles.room]: true,
                    [styles.selected]: selectedRoomId() === room.id,
                    [styles.unavailable]: !joinable(room),
                  }}
                  disabled={!joinable(room)}
                  onClick={() => setSelectedRoomId(room.id)}
                >
                  <span class={styles.roomName}>{room.name}</span>
                  <Show when={room.phase !== Phase.Lobby}>
                    <span class={styles.inProgress}>
                      {formatMessage('joinGame.inProgress')}
                    </span>
                  </Show>
                  <span class={styles.roomMeta}>
                    {formatMessage('joinGame.playerCount', {
                      count: room.playerCount,
                      max: room.maxPlayers,
                    })}
                  </span>
                  <Show when={room.hasPassword}>
                    <Icon name="masks" size={18} class={styles.lock} />
                  </Show>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <Show when={selectedRoom()}>
        <div class={styles.form}>
          <Show when={profileMissing}>
            <TextInput
              label={formatMessage('joinGame.yourName')}
              icon="people"
              value={playerName()}
              onInput={setPlayerName}
              onSubmit={submit}
            />
          </Show>
          <Show when={selectedRoom()!.hasPassword}>
            <TextInput
              label={formatMessage('joinGame.password')}
              icon="masks"
              type="password"
              value={password()}
              onInput={setPassword}
              onSubmit={submit}
            />
          </Show>

          <Show when={errorKey()}>
            <p class={styles.error}>{formatMessage(errorKey()!)}</p>
          </Show>

          <Button size="lg" onClick={submit}>
            {formatMessage(submitting() ? 'joinGame.joining' : 'joinGame.submit')}
          </Button>
        </div>
      </Show>
    </Screen>
  );
}
