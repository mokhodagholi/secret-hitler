import { Screen } from '../../components/Screen/Screen';
import { useApp } from '../../services/AppContext';
import styles from './MessengerOnlyScreen.module.scss';

/** Website visitors cannot sit. Bale and Telegram still open the same tables. */
export function MessengerOnlyScreen() {
  const { i18n } = useApp();
  const { formatMessage } = i18n;
  return (
    <Screen fill>
      <div class={styles.panel}>
        <h1 class={styles.title}>{formatMessage('messengerOnly.title')}</h1>
        <p class={styles.body}>{formatMessage('messengerOnly.body')}</p>
      </div>
    </Screen>
  );
}
