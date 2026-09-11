import { Show } from 'solid-js';
import { nativeFieldAttrs } from '../nativeField';
import styles from './TextArea.module.scss';

export interface TextAreaProps {
  label: string;
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  count?: string;
  disabled?: boolean;
  rows?: number;
}

/** Labelled navy letter field — the only caret besides name, code, and chat. */
export function TextArea(props: TextAreaProps) {
  return (
    <label class={styles.field}>
      <span class={styles.label}>{props.label}</span>
      <span classList={{ [styles.box]: true, [styles.invalid]: !!props.error }}>
        <textarea
          class={styles.input}
          value={props.value}
          placeholder={props.placeholder}
          maxlength={props.maxLength ?? 2000}
          disabled={props.disabled}
          rows={props.rows ?? 6}
          {...nativeFieldAttrs({ enterKeyHint: 'send' })}
          autocapitalize="sentences"
          onInput={(event) => props.onInput(event.currentTarget.value)}
        />
      </span>
      <span class={styles.meta}>
        <Show when={props.error}>
          <span class={styles.error}>{props.error}</span>
        </Show>
        <Show when={props.count}>
          <span class={styles.count}>{props.count}</span>
        </Show>
      </span>
    </label>
  );
}
