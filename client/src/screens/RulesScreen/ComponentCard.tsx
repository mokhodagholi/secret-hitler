import { Icon, type IconName } from '../../components/Icon/Icon';
import styles from './RulesScreen.module.scss';

export interface ComponentCardProps {
  icon: IconName;
  label: string;
  tone: 'liberal' | 'fascist' | 'neutral' | 'gold';
}

/** A single game-component tile in the Rules "Components" row. */
export function ComponentCard(props: ComponentCardProps) {
  return (
    <div class={styles.componentCard}>
      <span classList={{ [styles.componentIcon]: true, [styles[props.tone]]: true }}>
        <Icon name={props.icon} size={26} />
      </span>
      <span class={styles.componentLabel}>{props.label}</span>
    </div>
  );
}
