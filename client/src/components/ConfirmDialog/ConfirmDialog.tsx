import { Show } from 'solid-js';
import { Button } from '../Button/Button';
import styles from './ConfirmDialog.module.scss';

export interface ConfirmDialogProps {
  open: boolean;
  message: string;
  confirmLabel: string;
  /** Omit for a single-button notice (e.g. "the host left"). */
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/** Modal confirmation card over a dimmed backdrop. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <Show when={props.open}>
      <div
        class={styles.backdrop}
        onClick={(event) => {
          if (event.target === event.currentTarget) props.onCancel?.();
        }}
      >
        <div class={styles.dialog} role="alertdialog" aria-modal="true">
          <p class={styles.message}>{props.message}</p>
          <div class={styles.buttons}>
            <Show when={props.cancelLabel}>
              <Button variant="outline" onClick={() => props.onCancel?.()}>
                {props.cancelLabel}
              </Button>
            </Show>
            <Button onClick={() => props.onConfirm()}>
              {props.confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
}
