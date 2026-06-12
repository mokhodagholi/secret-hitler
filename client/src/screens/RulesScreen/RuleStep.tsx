import { Icon, type IconName } from '../../components/Icon/Icon';
import styles from './RulesScreen.module.scss';

export interface RuleStepProps {
  number: number;
  icon: IconName;
  title: string;
  body: string;
}

/** One numbered "How to Play" entry: badge, gold heading, description. */
export function RuleStep(props: RuleStepProps) {
  return (
    <li class={styles.step}>
      <span class={styles.badge}>
        <Icon name={props.icon} size={22} />
        <span class={styles.num}>{props.number}</span>
      </span>
      <div>
        <h3 class={styles.stepTitle}>{props.title}</h3>
        <p class={styles.stepBody}>{props.body}</p>
      </div>
    </li>
  );
}
