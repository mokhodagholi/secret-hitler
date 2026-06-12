import styles from './Toggle.module.scss';

export interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

/** Pill switch used by the on/off settings rows. */
export function Toggle(props: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      classList={{ [styles.track]: true, [styles.on]: props.checked }}
      onClick={() => props.onChange(!props.checked)}
    >
      <span class={styles.thumb} />
    </button>
  );
}
