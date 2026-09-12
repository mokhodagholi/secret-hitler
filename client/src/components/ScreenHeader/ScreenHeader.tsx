import { Show, createEffect, onCleanup, type JSX } from 'solid-js';
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
  const { nav, i18n, miniApp } = useApp();

  createEffect(() => {
    const override = props.onBack;
    if (!override) return;
    nav.setBackHandler(override);
    onCleanup(() => nav.clearBackHandler(override));
  });

  return (
    <header
      classList={{ [styles.header]: true, [styles.warm]: props.tone === 'warm' }}
    >
      <Show when={!miniApp.usesNativeBack()}>
        <button
          type="button"
          class={styles.back}
          onClick={() => nav.requestBack()}
          aria-label={i18n.formatMessage('common.goBack')}
        >
          <Icon name="arrowLeft" size={24} />
        </button>
      </Show>
      <Show when={props.right}>
        <div class={styles.right}>{props.right}</div>
      </Show>
      <h1 class={styles.title}>{props.title}</h1>
    </header>
  );
}
