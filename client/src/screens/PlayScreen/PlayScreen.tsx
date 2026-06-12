import { For, createEffect } from 'solid-js';
import { Phase } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import type { ScreenName } from '../../services/NavigationService';
import type { MessageKey } from '../../i18n';
import { Icon, type IconName } from '../../components/Icon/Icon';
import { Logo } from '../../components/Logo/Logo';
import { Screen } from '../../components/Screen/Screen';
import styles from './PlayScreen.module.scss';

interface PlayOption {
  icon: IconName;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  screen: ScreenName;
}

const PLAY_OPTIONS: PlayOption[] = [
  {
    icon: 'people',
    titleKey: 'play.createRoom',
    descriptionKey: 'play.createRoomDescription',
    screen: 'create-room',
  },
  {
    icon: 'door',
    titleKey: 'play.joinGame',
    descriptionKey: 'play.joinGameDescription',
    screen: 'join-game',
  },
];

/** "Choose an Option" — entry to the play flow: Create Room or Join Game. */
export function PlayScreen() {
  const { nav, game, i18n } = useApp();
  const { formatMessage } = i18n;

  // Already seated in a room (e.g. navigated back) — return to it instead of
  // letting the same person join again as a brand-new player.
  createEffect(() => {
    if (!game.inRoom()) return;
    const phase = game.view()?.phase;
    nav.navigate(phase && phase !== Phase.Lobby ? 'game' : 'waiting-room');
  });

  return (
    <Screen>
      <button
        type="button"
        class={styles.back}
        onClick={() => nav.back()}
        aria-label={formatMessage('common.goBack')}
      >
        <Icon name="arrowLeft" size={24} />
      </button>

      <div class={styles.logoWrap}>
        <Logo size="large" />
      </div>

      <h2 class={styles.heading}>{formatMessage('play.chooseOption')}</h2>

      <div class={styles.options}>
        <For each={PLAY_OPTIONS}>
          {(option) => (
            <button
              type="button"
              class={styles.option}
              onClick={() => nav.navigate(option.screen)}
            >
              <span class={styles.optionIcon}>
                <Icon name={option.icon} size={34} />
              </span>
              <span class={styles.optionTitle}>
                {formatMessage(option.titleKey)}
              </span>
              <span class={styles.optionDescription}>
                {formatMessage(option.descriptionKey)}
              </span>
            </button>
          )}
        </For>
      </div>
    </Screen>
  );
}
