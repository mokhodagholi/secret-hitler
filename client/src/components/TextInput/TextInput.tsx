import { Show } from 'solid-js';
import { Icon, type IconName } from '../Icon/Icon';
import styles from './TextInput.module.scss';

export interface TextInputProps {
  label: string;
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  icon?: IconName;
  maxLength?: number;
  error?: string;
  onSubmit?: () => void;
}

/** Labelled text field on a navy card — used by the Create/Join room forms. */
export function TextInput(props: TextInputProps) {
  return (
    <label class={styles.field}>
      <span class={styles.label}>{props.label}</span>
      <span classList={{ [styles.box]: true, [styles.invalid]: !!props.error }}>
        <Show when={props.icon}>
          <Icon name={props.icon!} size={20} class={styles.icon} />
        </Show>
        <input
          class={styles.input}
          type={props.type ?? 'text'}
          value={props.value}
          placeholder={props.placeholder}
          maxlength={props.maxLength ?? 40}
          onInput={(event) => props.onInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') props.onSubmit?.();
          }}
        />
      </span>
      <Show when={props.error}>
        <span class={styles.error}>{props.error}</span>
      </Show>
    </label>
  );
}
