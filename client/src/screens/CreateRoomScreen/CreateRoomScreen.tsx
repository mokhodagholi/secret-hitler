import { Show, createSignal } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { RoomApiError } from '../../services/GameStateService';
import type { MessageKey } from '../../i18n';
import { APP_NAV } from '../../components/BottomNav/BottomNav';
import { Button } from '../../components/Button/Button';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { TextInput } from '../../components/TextInput/TextInput';
import styles from './CreateRoomScreen.module.scss';

/** Create Room form — room name, optional password, host display name. */
export function CreateRoomScreen() {
  const { nav, settings, game, i18n } = useApp();
  const { formatMessage } = i18n;

  const [roomName, setRoomName] = createSignal('');
  const [password, setPassword] = createSignal('');
  // Asked only once — afterwards the profile name from Settings is used.
  const profileMissing = settings.settings.profileName.trim().length === 0;
  const [hostName, setHostName] = createSignal(settings.settings.profileName);
  const [submitting, setSubmitting] = createSignal(false);
  const [errorKey, setErrorKey] = createSignal<MessageKey | null>(null);

  const canSubmit = () =>
    roomName().trim().length > 0 && hostName().trim().length > 0 && !submitting();

  async function submit(): Promise<void> {
    if (!canSubmit()) return;
    setSubmitting(true);
    setErrorKey(null);
    settings.set('profileName', hostName().trim());
    try {
      await game.createRoom({
        name: roomName().trim(),
        password: password().trim() || undefined,
        hostName: hostName().trim(),
        options: {
          maxPlayers: settings.settings.playerCount,
          showRoles: settings.settings.showRoles,
          timerEnabled: settings.settings.timerEnabled,
          confirmActions: settings.settings.confirmActions,
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
    <Screen nav={APP_NAV}>
      <ScreenHeader title={formatMessage('createRoom.title')} />
      <div class={styles.form}>
        <TextInput
          label={formatMessage('createRoom.roomName')}
          placeholder={formatMessage('createRoom.roomNamePlaceholder')}
          icon="home"
          value={roomName()}
          onInput={setRoomName}
          onSubmit={submit}
        />
        <TextInput
          label={formatMessage('createRoom.password')}
          placeholder={formatMessage('createRoom.passwordPlaceholder')}
          icon="masks"
          type="password"
          value={password()}
          onInput={setPassword}
          onSubmit={submit}
        />
        <Show when={profileMissing}>
          <TextInput
            label={formatMessage('createRoom.yourName')}
            placeholder={formatMessage('createRoom.yourNamePlaceholder')}
            icon="people"
            value={hostName()}
            onInput={setHostName}
            onSubmit={submit}
          />
        </Show>

        <Show when={errorKey()}>
          <p class={styles.error}>{formatMessage(errorKey()!)}</p>
        </Show>

        <div class={styles.submit}>
          <Button size="lg" onClick={submit}>
            {formatMessage(submitting() ? 'createRoom.creating' : 'createRoom.submit')}
          </Button>
        </div>
      </div>
    </Screen>
  );
}
