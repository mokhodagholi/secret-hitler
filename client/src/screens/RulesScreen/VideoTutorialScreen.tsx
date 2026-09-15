import { useApp } from '../../services/AppContext';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { Button } from '../../components/Button/Button';
import { APARAT_WATCH_URL } from './topics';
import styles from './RulesScreen.module.scss';

/** Aparat will not play inside this Mini App — send them out to watch it. */
export function VideoTutorialScreen() {
  const { i18n } = useApp();
  const { formatMessage } = i18n;

  const openOnAparat = () => {
    window.open(APARAT_WATCH_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <Screen fill>
      <div class={styles.page}>
        <ScreenHeader title={formatMessage('tutorial.video')} />
        <div class={styles.videoOpen}>
          <Button onClick={openOnAparat}>{formatMessage('tutorial.videoOpen')}</Button>
        </div>
      </div>
    </Screen>
  );
}
