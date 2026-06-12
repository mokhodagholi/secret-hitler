import { For } from 'solid-js';
import { useApp } from '../../services/AppContext';
import type { ScreenName } from '../../services/NavigationService';
import { Icon, type IconName } from '../Icon/Icon';
import styles from './BottomNav.module.scss';

export interface NavItem {
  icon: IconName;
  label: string;
  screen: ScreenName;
}

/** Landing screen variant: Rules | How to Play | Settings */
export const LANDING_NAV: NavItem[] = [
  { icon: 'book', label: 'Rules', screen: 'rules' },
  { icon: 'people', label: 'How to Play', screen: 'how-to-play' },
  { icon: 'gear', label: 'Settings', screen: 'settings' },
];

/** Inner screens variant: Rules | Home | Settings */
export const APP_NAV: NavItem[] = [
  { icon: 'book', label: 'Rules', screen: 'rules' },
  { icon: 'home', label: 'Home', screen: 'home' },
  { icon: 'gear', label: 'Settings', screen: 'settings' },
];

export function BottomNav(props: { items: NavItem[] }) {
  const { nav } = useApp();
  return (
    <nav class={styles.nav}>
      <For each={props.items}>
        {(item) => (
          <button
            type="button"
            classList={{
              [styles.item]: true,
              [styles.active]: nav.screen() === item.screen,
            }}
            onClick={() => nav.navigate(item.screen)}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </button>
        )}
      </For>
    </nav>
  );
}
