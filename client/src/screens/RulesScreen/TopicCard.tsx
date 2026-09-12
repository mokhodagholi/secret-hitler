import { Icon, type IconName } from '../../components/Icon/Icon';
import type { BubbleOrigin, TopicHue } from './topics';
import styles from './RulesScreen.module.scss';

export interface TopicCardProps {
  icon: IconName;
  title: string;
  hue: TopicHue;
  bubbleOrigin: BubbleOrigin;
  onOpen: () => void;
}

/** Hub tile — tap to open one lesson, not the whole book. */
export function TopicCard(props: TopicCardProps) {
  return (
    <button
      type="button"
      classList={{
        [styles.topic]: true,
        [styles[props.hue]]: true,
        [styles[props.bubbleOrigin]]: true,
      }}
      aria-label={props.title}
      onClick={() => props.onOpen()}
    >
      <span class={styles.topicFace}>
        <span class={styles.topicBubbles} aria-hidden="true">
          <span class={styles.bubble} />
        </span>
        <span class={styles.topicIcon}>
          <Icon name={props.icon} size={28} class={styles.topicGlyph} />
        </span>
        <span class={styles.topicTitle}>{props.title}</span>
      </span>
    </button>
  );
}
