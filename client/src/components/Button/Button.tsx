import type { JSX } from 'solid-js';
import styles from './Button.module.scss';

export interface ButtonProps {
  children: JSX.Element;
  variant?: 'gold' | 'outline' | 'danger';
  size?: 'lg' | 'md';
  onClick?: () => void;
  /** Prefer this for getUserMedia — Android WebView click is not a gesture. */
  onPointerDown?: (event: PointerEvent) => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

/** Primary action button — gold filled (PLAY), gold outline, or red danger. */
export function Button(props: ButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      disabled={props.disabled}
      classList={{
        [styles.btn]: true,
        [styles.gold]: (props.variant ?? 'gold') === 'gold',
        [styles.outline]: props.variant === 'outline',
        [styles.danger]: props.variant === 'danger',
        [styles.lg]: props.size === 'lg',
      }}
      onClick={() => props.onClick?.()}
      onPointerDown={(event) => props.onPointerDown?.(event)}
    >
      {props.children}
    </button>
  );
}
