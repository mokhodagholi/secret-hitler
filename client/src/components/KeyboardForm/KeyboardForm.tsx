import type { JSX } from 'solid-js';
import styles from './KeyboardForm.module.scss';

export interface KeyboardFormProps {
  children: JSX.Element;
  class?: string;
}

/**
 * Marks a field cluster and its action so KeyboardService can dock the
 * block above the software keyboard. The document itself does not move.
 */
export function KeyboardForm(props: KeyboardFormProps) {
  return (
    <div class={`${styles.root} ${props.class ?? ''}`} data-keyboard-form>
      {props.children}
    </div>
  );
}
