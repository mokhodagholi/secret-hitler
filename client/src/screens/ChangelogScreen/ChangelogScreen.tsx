import { Show } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { CHANGELOG_RELEASES } from '../../changelog/releases';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { ChangelogList } from '../../components/ChangelogList/ChangelogList';
import styles from './ChangelogScreen.module.scss';

export function ChangelogScreen() {
  const { i18n } = useApp();
  const { formatMessage } = i18n;

  return (
    <Screen>
      <ScreenHeader title={formatMessage('changelog.title')} />
      <Show
        when={CHANGELOG_RELEASES.length > 0}
        fallback={<p class={styles.empty}>{formatMessage('changelog.empty')}</p>}
      >
        <ChangelogList
          releases={CHANGELOG_RELEASES}
          language={i18n.lang()}
          formatMessage={formatMessage}
        />
      </Show>
    </Screen>
  );
}
