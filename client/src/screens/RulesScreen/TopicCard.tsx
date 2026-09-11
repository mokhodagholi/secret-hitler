import { Icon, type IconName } from '../../components/Icon/Icon';
import styles from './RulesScreen.module.scss';

export interface TopicCardProps {
  icon: IconName;
  title: string;
  tease: string;
  tone: 'liberal' | 'fascist' | 'neutral' | 'gold';
  onOpen: () => void;
}

/** Hub tile — tap to open one lesson, not the whole book. */
export function TopicCard(props: TopicCardProps) {
  return (
    <button
      type="button"
      class={styles.topic}
      aria-label={props.title}
      onClick={() => props.onOpen()}
    >
      <span classList={{ [styles.topicIcon]: true, [styles[props.tone]]: true }}>
        <Icon name={props.icon} size={26} />
      </span>
      <span class={styles.topicTitle}>{props.title}</span>
      <span class={styles.topicTease}>{props.tease}</span>
    </button>
  );
}
