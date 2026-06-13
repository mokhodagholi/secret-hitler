import { Show } from 'solid-js';
import { useApp } from '../../services/AppContext';
import styles from './Toast.module.scss';

export interface ToastProps {
  message: string;
  title?: string;
  /** `prominent` for the player's own turn; `subtle` for ambient notices. */
  variant?: 'prominent' | 'subtle';
}

/** Transient, non-blocking notice that rises in over the board. */
export function Toast(props: ToastProps) {
  const { animation } = useApp();
  return (
    <div
      class={styles.toast}
      classList={{ [styles.subtle]: props.variant === 'subtle' }}
      role="status"
      ref={(element) => void animation.play(element, 'pop-in')}
    >
      <Show when={props.title}>
        <span class={styles.title}>{props.title}</span>
      </Show>
      <span class={styles.message}>{props.message}</span>
    </div>
  );
}
