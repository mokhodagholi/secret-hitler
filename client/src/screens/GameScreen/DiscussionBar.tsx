import { Show } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import { Icon } from '../../components/Icon/Icon';
import styles from './DiscussionBar.module.scss';

export interface DiscussionBarProps {
  isPresident: boolean;
  /** Seconds left in the discussion window, or null when untimed. */
  secondsLeft?: number | null;
  /** President skips the remaining discussion and opens nomination. */
  onStartNomination: () => void;
  formatMessage: FormatMessage;
}

/** Open-discussion banner — everyone may chat; a countdown and, for the
 *  President, a button to start nomination early. */
export function DiscussionBar(props: DiscussionBarProps) {
  const { formatMessage } = props;
  return (
    <div class={styles.discussionBar}>
      <span dir="auto">{formatMessage('game.discussionOpen')}</span>
      <div class={styles.trailing}>
        <Show when={props.secondsLeft != null}>
          <span
            classList={{
              [styles.timer]: true,
              [styles.urgent]: (props.secondsLeft ?? 0) <= 10,
            }}
          >
            <Icon name="clock" size={13} />
            {formatMessage('game.discussionLeft', {
              time: formatClock(props.secondsLeft!),
            })}
          </span>
        </Show>
        <Show when={props.isPresident}>
          <button
            type="button"
            class={styles.startButton}
            onClick={props.onStartNomination}
          >
            {formatMessage('game.startNomination')}
          </button>
        </Show>
      </div>
    </div>
  );
}

/** Seconds → m:ss for the discussion countdown. */
function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
