import { Show, type JSX } from 'solid-js';
import { BottomNav, type NavItem } from '../BottomNav/BottomNav';
import { useApp } from '../../services/AppContext';
import styles from './Screen.module.scss';

export interface ScreenProps {
  children: JSX.Element;
  nav?: NavItem[];
}

/**
 * Page shell shared by every screen: phone-width column, navy gradient,
 * gold border frame with art-deco corner ornaments, scrollable content
 * area and an optional bottom navigation bar.
 */
export function Screen(props: ScreenProps) {
  const { animation } = useApp();
  return (
    <div class={styles.shell}>
      {/* Each navigation mounts a fresh screen — its content rises in. */}
      <main
        classList={{ [styles.content]: true, [styles.withNav]: !!props.nav }}
        ref={(element) => void animation.play(element, 'screen-enter')}
      >
        {props.children}
      </main>
      <Show when={props.nav}>
        <BottomNav items={props.nav!} />
      </Show>
    </div>
  );
}
