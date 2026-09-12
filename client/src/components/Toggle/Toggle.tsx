import styles from './Toggle.module.scss';

export interface ToggleProps {
  checked: boolean;
}

/** Visual pill. The setting row is the control that flips it. */
export function Toggle(props: ToggleProps) {
  return (
    <span
      classList={{ [styles.track]: true, [styles.on]: props.checked }}
      aria-hidden="true"
    >
      <span class={styles.thumb} />
    </span>
  );
}
