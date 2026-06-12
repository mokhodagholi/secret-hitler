import { Show } from 'solid-js';
import { Icon, type IconName } from '../Icon/Icon';
import styles from './SectionTitle.module.scss';

export interface SectionTitleProps {
  children: string;
  /** Centered star-flanked heading (Rules screen) vs left-aligned (Settings). */
  centered?: boolean;
  icon?: IconName;
}

export function SectionTitle(props: SectionTitleProps) {
  return (
    <h2 classList={{ [styles.title]: true, [styles.centered]: props.centered }}>
      <Show when={props.centered} fallback={props.children}>
        <Icon name="star" size={12} class={styles.star} />
        <span>{props.children}</span>
        <Icon name="star" size={12} class={styles.star} />
      </Show>
    </h2>
  );
}
