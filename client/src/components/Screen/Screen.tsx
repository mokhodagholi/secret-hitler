import { Show, type JSX } from 'solid-js';
import { BottomNav, type NavItem } from '../BottomNav/BottomNav';
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
  return (
    <div class={styles.shell}>
      <div class={styles.frame} aria-hidden="true" />
      <Corner position="tl" />
      <Corner position="tr" />
      <Corner position="bl" />
      <Corner position="br" />
      <main class={styles.content}>{props.children}</main>
      <Show when={props.nav}>
        <BottomNav items={props.nav!} />
      </Show>
    </div>
  );
}

function Corner(props: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  return (
    <svg
      classList={{ [styles.corner]: true, [styles[props.position]]: true }}
      viewBox="0 0 28 28"
      aria-hidden="true"
    >
      <path d="M1 1h25L1 26Z" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M1 1h15L1 16Z" fill="currentColor" />
    </svg>
  );
}
