import {
  For,
  Show,
  createEffect,
  createResource,
  createSignal,
} from 'solid-js';
import { Phase, type RoomSummary } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { RoomApiError } from '../../services/GameStateService';
import { ERROR_MESSAGE_KEYS, type MessageKey } from '../../i18n';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { nativeFieldAttrs } from '../../components/nativeField';
import styles from './RoomsScreen.module.scss';

type RoomsTab = 'create' | 'join';

export interface RoomsScreenProps {
  initialTab?: RoomsTab;
}

export function RoomsScreen(props: RoomsScreenProps) {
  const { nav, game, i18n } = useApp();
  const { formatMessage } = i18n;
  const [tab, setTab] = createSignal<RoomsTab>(props.initialTab ?? 'create');

  createEffect(() => {
    if (!game.inRoom()) return;
    const phase = game.view()?.phase;
    nav.navigate(phase && phase !== Phase.Lobby ? 'game' : 'waiting-room');
  });

  return (
    <Screen>
      <div class={styles.scene}>
        <div class={styles.backdrop} aria-hidden="true" />

        <ScreenHeader title={formatMessage('play.title')} tone="warm" />

        <div class={styles.panel}>
          <div class={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab() === 'create'}
              classList={{ [styles.tab]: true, [styles.tabActive]: tab() === 'create' }}
              onClick={() => setTab('create')}
            >
              {formatMessage('rooms.createTab')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab() === 'join'}
              classList={{ [styles.tab]: true, [styles.tabActive]: tab() === 'join' }}
              onClick={() => setTab('join')}
            >
              {formatMessage('rooms.joinTab')}
            </button>
          </div>

          <div class={styles.board}>
            <Show when={tab() === 'create'} fallback={<JoinRoomPanel />}>
              <CreateRoomPanel />
            </Show>
          </div>
        </div>
      </div>
    </Screen>
  );
}

function Field(props: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  disabled?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <label class={styles.field}>
      <span class={styles.fieldLabel}>{props.label}</span>
      <input
        class={styles.input}
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        maxlength={40}
        disabled={props.disabled}
        readOnly={props.disabled}
        {...nativeFieldAttrs({
          password: props.type === 'password',
          enterKeyHint: 'go',
        })}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') props.onSubmit?.();
        }}
      />
    </label>
  );
}

function CreateRoomPanel() {
  const { nav, settings, game, i18n, bale } = useApp();
  const { formatMessage } = i18n;

  const [roomName, setRoomName] = createSignal('');
  const [password, setPassword] = createSignal('');
  const baleName = () => bale.user()?.firstName;
  const profileMissing = () =>
    baleName() == null && settings.settings.profileName.trim().length === 0;
  const [hostName, setHostName] = createSignal(settings.settings.profileName);
  const [submitting, setSubmitting] = createSignal(false);
  const [errorKey, setErrorKey] = createSignal<MessageKey | null>(null);

  const resolvedName = () => baleName() ?? hostName().trim();

  const canSubmit = () =>
    roomName().trim().length > 0 && resolvedName().length > 0 && !submitting();

  async function submit(): Promise<void> {
    if (!canSubmit()) return;
    setSubmitting(true);
    setErrorKey(null);
    settings.set('profileName', resolvedName());
    try {
      await game.createRoom({
        name: roomName().trim(),
        password: password().trim() || undefined,
        hostName: resolvedName(),
        avatar: settings.settings.avatar,
        initData: bale.initData(),
        options: {
          timerEnabled: true,
        },
      });
      nav.navigate('waiting-room');
    } catch (error) {
      const code = error instanceof RoomApiError ? error.code : 'NETWORK';
      setErrorKey(`error.${code}` as MessageKey);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class={styles.form}>
      <Field
        label={formatMessage('createRoom.roomName')}
        placeholder={formatMessage('createRoom.roomNamePlaceholder')}
        value={roomName()}
        onInput={setRoomName}
        onSubmit={submit}
      />
      <Field
        label={formatMessage('createRoom.password')}
        placeholder={formatMessage('createRoom.passwordPlaceholder')}
        type="password"
        value={password()}
        onInput={setPassword}
        onSubmit={submit}
      />
      <Show when={profileMissing()}>
        <Field
          label={formatMessage('createRoom.yourName')}
          placeholder={formatMessage('createRoom.yourNamePlaceholder')}
          value={hostName()}
          onInput={setHostName}
          onSubmit={submit}
        />
      </Show>

      <Show when={errorKey()}>
        <p class={styles.error}>{formatMessage(errorKey()!)}</p>
      </Show>

      <button
        type="button"
        class={styles.primary}
        disabled={!canSubmit()}
        onClick={submit}
      >
        {formatMessage(submitting() ? 'createRoom.creating' : 'createRoom.submit')}
      </button>
    </div>
  );
}

function JoinRoomPanel() {
  const { nav, settings, game, i18n, bale } = useApp();
  const { formatMessage } = i18n;

  const [rooms, { refetch }] = createResource(() => game.listRooms());
  const [selectedRoomId, setSelectedRoomId] = createSignal<string | null>(null);
  const [pendingJoinCode, setPendingJoinCode] = createSignal(nav.consumeJoinCode());
  const baleName = () => bale.user()?.firstName;
  const profileMissing = () =>
    baleName() == null && settings.settings.profileName.trim().length === 0;
  const [playerName, setPlayerName] = createSignal(settings.settings.profileName);
  const [password, setPassword] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);
  const [errorKey, setErrorKey] = createSignal<MessageKey | null>(null);

  const joinable = (room: RoomSummary) =>
    room.phase === Phase.Lobby && room.playerCount < room.maxPlayers;

  const selectedRoom = (): RoomSummary | null =>
    rooms()?.find((room) => room.id === selectedRoomId()) ?? null;

  createEffect(() => {
    const code = pendingJoinCode();
    const match = rooms()?.find((room) => room.code === code);
    if (!code || !rooms()) return;
    if (match && joinable(match)) setSelectedRoomId(match.id);
    setPendingJoinCode(null);
  });

  const needsDetails = (room: RoomSummary) => room.hasPassword || profileMissing();

  function pick(room: RoomSummary): void {
    if (!joinable(room)) return;
    setErrorKey(null);
    setSelectedRoomId(room.id);
    if (!needsDetails(room)) void submit(room);
  }

  async function submit(room?: RoomSummary | null): Promise<void> {
    const target = room ?? selectedRoom();
    const name = baleName() ?? playerName().trim();
    if (!target || submitting() || name.length === 0) return;
    setSubmitting(true);
    setErrorKey(null);
    settings.set('profileName', name);
    try {
      await game.joinRoom(target.id, {
        name,
        avatar: settings.settings.avatar,
        password: password().trim() || undefined,
        initData: bale.initData(),
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
    <div class={styles.join}>
      <div class={styles.tableHead}>
        <span class={styles.thName}>{formatMessage('joinGame.colName')}</span>
        <span class={styles.thPlayers}>{formatMessage('joinGame.colPlayers')}</span>
        <button
          type="button"
          class={styles.refresh}
          aria-label={formatMessage('joinGame.refresh')}
          onClick={() => void refetch()}
        >
          <Icon name="refresh" size={16} />
        </button>
      </div>

      <Show
        when={(rooms() ?? []).length > 0}
        fallback={<p class={styles.empty}>{formatMessage('joinGame.noRooms')}</p>}
      >
        <ul class={styles.rows}>
          <For each={rooms()}>
            {(room) => (
              <li
                classList={{
                  [styles.row]: true,
                  [styles.rowSelected]: selectedRoomId() === room.id,
                  [styles.rowUnavailable]: !joinable(room),
                }}
              >
                <span class={styles.roomName}>
                  {room.name}
                  <Show when={room.hasPassword}>
                    <Icon name="masks" size={13} class={styles.lock} />
                  </Show>
                </span>
                <span class={styles.roomPlayers}>
                  <Show
                    when={room.phase === Phase.Lobby}
                    fallback={formatMessage('joinGame.inProgress')}
                  >
                    {formatMessage('joinGame.playerCountShort', {
                      count: room.playerCount,
                      max: room.maxPlayers,
                    })}
                  </Show>
                </span>
                <button
                  type="button"
                  class={styles.joinButton}
                  disabled={!joinable(room) || submitting()}
                  onClick={() => pick(room)}
                >
                  {formatMessage('joinGame.join')}
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <Show when={selectedRoom() && needsDetails(selectedRoom()!)}>
        <div class={styles.form}>
          <Show when={profileMissing()}>
            <Field
              label={formatMessage('joinGame.yourName')}
              value={playerName()}
              onInput={setPlayerName}
              onSubmit={() => void submit()}
            />
          </Show>
          <Show when={selectedRoom()!.hasPassword}>
            <Field
              label={formatMessage('joinGame.password')}
              type="password"
              value={password()}
              onInput={setPassword}
              onSubmit={() => void submit()}
            />
          </Show>
          <button
            type="button"
            class={styles.primary}
            disabled={submitting()}
            onClick={() => void submit()}
          >
            {formatMessage(submitting() ? 'joinGame.joining' : 'joinGame.submit')}
          </button>
        </div>
      </Show>

      <Show when={errorKey()}>
        <p class={styles.error}>{formatMessage(errorKey()!)}</p>
      </Show>
    </div>
  );
}
