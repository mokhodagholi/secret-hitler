import type { JSX } from 'solid-js';
import styles from './KeyboardForm.module.scss';

export interface KeyboardFormProps {
  children: JSX.Element;
  class?: string;
}

/**
 * Field cluster plus its action. The last button sticks to the pane so the
 * submit control stays reachable while KeyboardService pads the shell.
 */
export function KeyboardForm(props: KeyboardFormProps) {
  return (
    <div class={`${styles.root} ${props.class ?? ''}`} data-keyboard-form>
      {props.children}
    </div>
  );
}
