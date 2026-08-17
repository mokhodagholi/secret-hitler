import { Show, type JSX } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Icon } from '../Icon/Icon';
import styles from './ScreenHeader.module.scss';

export interface ScreenHeaderProps {
  title: string;
  right?: JSX.Element;
  /** 'warm' recolors the title and back arrow to a sepia yellow-brown. */
  tone?: 'default' | 'warm';
  /** Overrides the default `nav.back()` — e.g. to leave a room first. */
  onBack?: () => void;
}

/** Inner-screen header: back button, small logo, screen title, optional right action. */
export function ScreenHeader(props: ScreenHeaderProps) {
  const { nav, i18n } = useApp();
  return (
    <header
      classList={{ [styles.header]: true, [styles.warm]: props.tone === 'warm' }}
    >
      <button
        type="button"
        class={styles.back}
        onClick={() => (props.onBack ? props.onBack() : nav.back())}
        aria-label={i18n.formatMessage('common.goBack')}
      >
        <Icon name="arrowLeft" size={24} />
      </button>
      <Show when={props.right}>
        <div class={styles.right}>{props.right}</div>
      </Show>
      <h1 class={styles.title}>{props.title}</h1>
    </header>
  );
}
