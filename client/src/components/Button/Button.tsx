import type { JSX } from 'solid-js';
import styles from './Button.module.scss';

export interface ButtonProps {
  children: JSX.Element;
  variant?: 'gold' | 'outline';
  size?: 'lg' | 'md';
  onClick?: () => void;
  type?: 'button' | 'submit';
}

/** Primary action button — gold filled (PLAY) or gold outline (Restore Purchases). */
export function Button(props: ButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      classList={{
        [styles.btn]: true,
        [styles.gold]: (props.variant ?? 'gold') === 'gold',
        [styles.outline]: props.variant === 'outline',
        [styles.lg]: props.size === 'lg',
      }}
      onClick={() => props.onClick?.()}
    >
      {props.children}
    </button>
  );
}
