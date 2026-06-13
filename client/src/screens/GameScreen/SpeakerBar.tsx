import { Show } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import { isolateBidi } from '../../i18n/utils';
import { Icon } from '../../components/Icon/Icon';
import styles from './SpeakerBar.module.scss';

export interface SpeakerBarProps {
  isMine: boolean;
  speakerName: string;
  /** Seconds left on this discussion turn, or null when untimed. */
  secondsLeft?: number | null;
  onEndTurn: () => void;
  formatMessage: FormatMessage;
}

/** Discussion turn indicator — who holds the floor, the countdown, end-turn. */
export function SpeakerBar(props: SpeakerBarProps) {
  const { formatMessage } = props;
  return (
    <div
      classList={{ [styles.speakerBar]: true, [styles.speakerMine]: props.isMine }}
    >
      <span dir="auto">
        {props.isMine
          ? formatMessage('game.yourTurn')
          : formatMessage('game.speakingNow', {
              name: isolateBidi(props.speakerName),
            })}
      </span>
      <div class={styles.trailing}>
        <Show when={props.secondsLeft != null}>
          <span
            classList={{
              [styles.timer]: true,
              [styles.urgent]: (props.secondsLeft ?? 0) <= 4,
            }}
          >
            <Icon name="clock" size={13} />
            {formatMessage('game.secondsLeft', { seconds: props.secondsLeft! })}
          </span>
        </Show>
        <Show when={props.isMine}>
          <button type="button" class={styles.speakerEnd} onClick={props.onEndTurn}>
            {formatMessage('game.endTurn')}
          </button>
        </Show>
      </div>
    </div>
  );
}
