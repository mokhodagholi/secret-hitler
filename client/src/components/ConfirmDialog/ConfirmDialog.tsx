import { Show, type JSX, onCleanup, onMount } from 'solid-js';
import { Button } from '../Button/Button';
import styles from './ConfirmDialog.module.scss';

export interface ConfirmDialogProps {
  open: boolean;
  message: string;
  children?: JSX.Element;
  confirmLabel?: string;
  /** Omit for a single-button notice (e.g. "the host left"). */
  cancelLabel?: string;
  /** Omit with no labels for a blocking status card (reconnect). */
  onConfirm?: () => void;
  onCancel?: () => void;
  /** Auto-dismiss after this many ms. Hides action buttons when set. */
  autoCloseMs?: number;
}

/** Modal confirmation card over a dimmed backdrop. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <Show when={props.open}>
      <Notice
        message={props.message}
        confirmLabel={props.confirmLabel}
        cancelLabel={props.cancelLabel}
        onConfirm={props.onConfirm}
        onCancel={props.onCancel}
        autoCloseMs={props.autoCloseMs}
      >
        {props.children}
      </Notice>
    </Show>
  );
}

function Notice(props: {
  message: string;
  children?: JSX.Element;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  autoCloseMs?: number;
}) {
  const timed = () => props.autoCloseMs != null && props.autoCloseMs > 0;

  onMount(() => {
    if (!timed()) return;
    const timer = window.setTimeout(() => props.onConfirm?.(), props.autoCloseMs);
    onCleanup(() => clearTimeout(timer));
  });

  return (
    <div
      class={styles.backdrop}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        if (timed()) props.onConfirm?.();
        else props.onCancel?.();
      }}
    >
      <div class={styles.dialog} role="alertdialog" aria-modal="true">
        <p class={styles.message}>{props.message}</p>
        <Show when={props.children}>
          <div class={styles.body}>{props.children}</div>
        </Show>
        <Show when={!timed() && props.confirmLabel}>
          <div class={styles.buttons}>
            <Show when={props.cancelLabel}>
              <Button variant="outline" onClick={() => props.onCancel?.()}>
                {props.cancelLabel}
              </Button>
            </Show>
            <Button onClick={() => props.onConfirm?.()}>{props.confirmLabel}</Button>
          </div>
        </Show>
      </div>
    </div>
  );
}
