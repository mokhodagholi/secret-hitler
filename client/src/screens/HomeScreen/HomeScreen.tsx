import { useApp } from '../../services/AppContext';
import { LANDING_NAV } from '../../components/BottomNav/BottomNav';
import { Button } from '../../components/Button/Button';
import { EagleEmblem } from '../../components/Emblem/EagleEmblem';
import { Logo } from '../../components/Logo/Logo';
import { Screen } from '../../components/Screen/Screen';
import { Silhouettes } from './Silhouettes';
import styles from './HomeScreen.module.scss';

export function HomeScreen() {
  const { nav, i18n } = useApp();
  const { formatMessage } = i18n;
  return (
    <Screen nav={LANDING_NAV}>
      <div class={styles.home}>
        <EagleEmblem class={styles.eagle} width={80} />
        <Silhouettes class={styles.art} />
        <div class={styles.logoWrap}>
          <Logo size="large" tagline />
        </div>
        <div class={styles.cta}>
          <Button size="lg" onClick={() => nav.navigate('play')}>
            {formatMessage('home.play')}
          </Button>
        </div>
      </div>
    </Screen>
  );
}
