import { Show } from 'solid-js';
import type { ExecutivePower } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import styles from './GameScreen.module.scss';

export interface PowerPanelProps {
  formatMessage: FormatMessage;
  power: ExecutivePower;
  isPresident: boolean;
  presidentName: string;
  investigation: { name: string; party: 'liberal' | 'fascist' } | null;
  secondsLeft: number;
}

const HINT_KEY = {
  policyPeek: 'game.power.peekHint',
  investigate: 'game.power.investigateHint',
  execution: 'game.power.executeHint',
  specialElection: 'game.power.electHint',
} as const;

/** President's power UI. Seat taps on the table pick the target. Peek is its own overlay. */
export function PowerPanel(props: PowerPanelProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  const urgent = () => props.secondsLeft > 0 && props.secondsLeft <= 4;

  return (
    <div class={styles.votePanel}>
      <Show
        when={props.isPresident}
        fallback={
          <span class={styles.voteWaiting}>
            {formatMessage('game.power.inProgress', { name: props.presidentName })}
          </span>
        }
      >
        <span class={styles.votePrompt}>{formatMessage(HINT_KEY[props.power])}</span>

        <Show when={props.investigation}>
          {(result) => (
            <span class={styles.investigationResult}>
              {formatMessage('game.power.investigationResult', {
                name: result().name,
                party: formatMessage(`game.${result().party}`),
              })}
            </span>
          )}
        </Show>

        <Show when={props.secondsLeft > 0 && !props.investigation}>
          <span
            classList={{
              [styles.voteClock]: true,
              [styles.urgent]: urgent(),
              [styles.pulse]: urgent() && animation.motionEnabled(),
            }}
          >
            {formatMessage('game.secondsLeft', { seconds: props.secondsLeft })}
          </span>
        </Show>
      </Show>
    </div>
  );
}
