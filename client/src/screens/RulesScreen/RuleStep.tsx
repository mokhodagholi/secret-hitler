import { Show } from 'solid-js';
import { Icon, type IconName } from '../../components/Icon/Icon';
import styles from './RulesScreen.module.scss';

export interface RuleStepProps {
  /** Omitted for unordered reference lists (powers), shown for round steps. */
  number?: number;
  icon: IconName;
  title: string;
  body: string;
}

/** One rule entry: icon badge (optionally numbered), gold heading, description. */
export function RuleStep(props: RuleStepProps) {
  return (
    <li class={styles.step}>
      <span class={styles.badge}>
        <Icon name={props.icon} size={22} />
        <Show when={props.number !== undefined}>
          <span class={styles.num}>{props.number}</span>
        </Show>
      </span>
      <div>
        <h3 class={styles.stepTitle}>{props.title}</h3>
        <p class={styles.stepBody}>{props.body}</p>
      </div>
    </li>
  );
}
