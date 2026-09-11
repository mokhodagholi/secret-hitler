import { Show, onCleanup, onMount } from 'solid-js';
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
  onContinue: () => void;
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
  const needsAck = () => props.investigation != null;

  onMount(() => {
    if (!needsAck()) return;
    const lingerMs =
      import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test' ? 200 : 4000;
    const timer = window.setTimeout(() => props.onContinue(), lingerMs);
    onCleanup(() => clearTimeout(timer));
  });

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
      </Show>
    </div>
  );
}
