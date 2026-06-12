import { APP_NAV } from '../../components/BottomNav/BottomNav';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import styles from './PlaceholderScreen.module.scss';

/** Stub for screens not yet built (How to Play, About, Play flow). */
export function PlaceholderScreen(props: { title: string }) {
  return (
    <Screen nav={APP_NAV}>
      <ScreenHeader title={props.title} />
      <p class={styles.note}>Coming soon.</p>
    </Screen>
  );
}
