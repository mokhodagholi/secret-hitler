import { Show } from 'solid-js';
import styles from './HelpBar.module.scss';

export interface HelpBarProps {
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * President's table action (start nomination / end round). Chat, players, and
 * settings live on the docked chat chrome.
 */
export function HelpBar(props: HelpBarProps) {
  return (
    <Show when={props.actionLabel && props.onAction}>
      <footer class={styles.bar}>
        <button type="button" class={styles.action} onClick={props.onAction}>
          {props.actionLabel}
        </button>
      </footer>
    </Show>
  );
}
