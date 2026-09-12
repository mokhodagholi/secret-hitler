import { Index } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import styles from './RulesScreen.module.scss';

const TRACKER_SLOTS = 3;

export interface FailTrackerProps {
  formatMessage: FormatMessage;
}

/** The election tracker as it sits on the table: three marks, third is chaos. */
export function FailTracker(props: FailTrackerProps) {
  const labels = [
    props.formatMessage('rules.failTracker.first'),
    props.formatMessage('rules.failTracker.second'),
    props.formatMessage('rules.failTracker.chaos'),
  ];

  return (
    <ol class={styles.failTrack} aria-hidden="true">
      <Index each={labels}>
        {(label, index) => (
          <li class={styles.failStop}>
            <span
              classList={{
                [styles.failMark]: true,
                [styles.failMarkChaos]: index === TRACKER_SLOTS - 1,
              }}
            >
              {props.formatMessage('rules.stepNumber', { number: index + 1 })}
            </span>
            <span class={styles.failLabel}>{label()}</span>
          </li>
        )}
      </Index>
    </ol>
  );
}
