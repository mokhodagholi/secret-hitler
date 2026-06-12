import { For } from 'solid-js';
import { Icon, type IconName } from '../../components/Icon/Icon';
import styles from './HowToPlayScreen.module.scss';

export interface TutorialPoint {
  icon: IconName;
  text: string;
}

export interface TutorialStepProps {
  number: number;
  icon: IconName;
  title: string;
  subtitle: string;
  /** Decorative icon tiles illustrating the step. */
  art: IconName[];
  points: TutorialPoint[];
}

/** One tutorial slide: numbered heading, illustration tiles, and key points. */
export function TutorialStep(props: TutorialStepProps) {
  return (
    <article class={styles.step}>
      <header class={styles.heading}>
        <span class={styles.badge}>
          <Icon name={props.icon} size={22} />
          <span class={styles.num}>{props.number}</span>
        </span>
        <h2 class={styles.title}>{props.title}</h2>
      </header>

      <p class={styles.subtitle}>{props.subtitle}</p>

      <div class={styles.art} aria-hidden="true">
        <For each={props.art}>
          {(artIcon) => (
            <span class={styles.tile}>
              <Icon name={artIcon} size={28} />
            </span>
          )}
        </For>
      </div>

      <ul class={styles.points}>
        <For each={props.points}>
          {(point) => (
            <li class={styles.point}>
              <Icon name={point.icon} size={18} class={styles.pointIcon} />
              <span>{point.text}</span>
            </li>
          )}
        </For>
      </ul>
    </article>
  );
}
