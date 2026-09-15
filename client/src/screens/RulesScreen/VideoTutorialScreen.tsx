import { useApp } from '../../services/AppContext';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { Button } from '../../components/Button/Button';
import { APARAT_EMBED_URL, APARAT_WATCH_URL } from './topics';
import styles from './RulesScreen.module.scss';

/** In-app Aparat lesson. The labeled control is the fallback when the iframe is blocked. */
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
        <div class={styles.body}>
          <div class={styles.videoFrame}>
            <iframe
              class={styles.videoEmbed}
              src={APARAT_EMBED_URL}
              title={formatMessage('tutorial.video')}
              allow="accelerometer; autoplay; encrypted-media; fullscreen"
              allowfullscreen
            />
          </div>
          <div class={styles.videoFallback}>
            <Button variant="outline" onClick={openOnAparat}>
              {formatMessage('tutorial.videoOpen')}
            </Button>
          </div>
        </div>
      </div>
    </Screen>
  );
}
