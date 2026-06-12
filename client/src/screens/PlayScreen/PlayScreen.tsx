import { useApp } from '../../services/AppContext';
import type { ScreenName } from '../../services/NavigationService';
import type { MessageKey } from '../../i18n';
import { APP_NAV } from '../../components/BottomNav/BottomNav';
import { Icon, type IconName } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import styles from './PlayScreen.module.scss';

interface PlayOption {
  icon: IconName;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  screen: ScreenName;
}

const PLAY_OPTIONS: PlayOption[] = [
  {
    icon: 'cards',
    titleKey: 'play.createRoom',
    descriptionKey: 'play.createRoomDescription',
    screen: 'create-room',
  },
  {
    icon: 'people',
    titleKey: 'play.joinGame',
    descriptionKey: 'play.joinGameDescription',
    screen: 'join-game',
  },
];

/** "Choose an Option" — entry to the play flow: Create Room or Join Game. */
export function PlayScreen() {
  const { nav, i18n } = useApp();
  const { formatMessage } = i18n;

  return (
    <Screen nav={APP_NAV}>
      <ScreenHeader title={formatMessage('play.title')} />
      <div class={styles.options}>
        {PLAY_OPTIONS.map((option) => (
          <button
            type="button"
            class={styles.option}
            onClick={() => nav.navigate(option.screen)}
          >
            <span class={styles.optionIcon}>
              <Icon name={option.icon} size={30} />
            </span>
            <span class={styles.optionText}>
              <span class={styles.optionTitle}>
                {formatMessage(option.titleKey)}
              </span>
              <span class={styles.optionDescription}>
                {formatMessage(option.descriptionKey)}
              </span>
            </span>
            <Icon name="chevronRight" size={20} class={styles.chevron} />
          </button>
        ))}
      </div>
    </Screen>
  );
}
