import { For } from 'solid-js';
import { useApp } from '../../services/AppContext';
import type { MessageKey } from '../../i18n';
import type { ScreenName } from '../../services/NavigationService';
import { Icon, type IconName } from '../Icon/Icon';
import styles from './BottomNav.module.scss';

export interface NavItem {
  icon: IconName;
  /** Message id for the tab label — resolved per active language. */
  labelKey: MessageKey;
  screen: ScreenName;
}

/** Inner screens variant: How to Play | Home | Settings */
export const APP_NAV: NavItem[] = [
  { icon: 'book', labelKey: 'nav.rules', screen: 'rules' },
  { icon: 'home', labelKey: 'nav.home', screen: 'home' },
  { icon: 'gear', labelKey: 'nav.settings', screen: 'settings' },
];

export function BottomNav(props: { items: NavItem[] }) {
  const { nav, i18n } = useApp();
  const { formatMessage } = i18n;
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
            <span>{formatMessage(item.labelKey)}</span>
          </button>
        )}
      </For>
    </nav>
  );
}
