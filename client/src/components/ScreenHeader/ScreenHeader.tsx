import { Show, type JSX } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Icon } from '../Icon/Icon';
import { Logo } from '../Logo/Logo';
import styles from './ScreenHeader.module.scss';

export interface ScreenHeaderProps {
  title: string;
  right?: JSX.Element;
}

/** Inner-screen header: back button, small logo, screen title, optional right action. */
export function ScreenHeader(props: ScreenHeaderProps) {
  const { nav } = useApp();
  return (
    <header class={styles.header}>
      <button
        type="button"
        class={styles.back}
        onClick={() => nav.back()}
        aria-label="Go back"
      >
        <Icon name="arrowLeft" size={24} />
      </button>
      <Show when={props.right}>
        <div class={styles.right}>{props.right}</div>
      </Show>
      <Logo size="small" />
      <h1 class={styles.title}>{props.title}</h1>
    </header>
  );
}
