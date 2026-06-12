import { Show } from 'solid-js';
import { Icon } from '../Icon/Icon';
import styles from './Logo.module.scss';

export interface LogoProps {
  size?: 'large' | 'small';
  tagline?: boolean;
}

/** Art-deco "SECRET HITLER" wordmark with winged flanks and star. */
export function Logo(props: LogoProps) {
  return (
    <div
      classList={{
        [styles.logo]: true,
        [styles.large]: props.size === 'large',
      }}
    >
      <span class={styles.secret}>Secret</span>
      <div class={styles.row}>
        <Wing />
        <span class={styles.hitler}>Hitler</span>
        <Wing flip />
      </div>
      <Icon name="star" size={props.size === 'large' ? 16 : 11} class={styles.star} />
      <Show when={props.tagline}>
        <p class={styles.tagline}>
          A game of deduction,
          <br />
          deception, and fascism
        </p>
      </Show>
    </div>
  );
}

function Wing(props: { flip?: boolean }) {
  return (
    <svg
      classList={{ [styles.wing]: true, [styles.flipped]: props.flip }}
      viewBox="0 0 40 26"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M40 2 2 0l6 6 32 1.5Z" />
      <path d="M40 10 10 8.5 15 14l25 1Z" />
      <path d="M40 18 17 17l4.5 5L40 22.5Z" />
    </svg>
  );
}
