import { For, Show, onMount } from 'solid-js';
import type { ExecutivePower, Policy } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import styles from './GameScreen.module.scss';

export interface PowerPanelProps {
  formatMessage: FormatMessage;
  power: ExecutivePower;
  isPresident: boolean;
  presidentName: string;
  peek: Policy[];
  investigation: { name: string; party: 'liberal' | 'fascist' } | null;
  onContinue: () => void;
}

const HINT_KEY = {
  policyPeek: 'game.power.peekHint',
  investigate: 'game.power.investigateHint',
  execution: 'game.power.executeHint',
  specialElection: 'game.power.electHint',
} as const;

/** President's power UI. Seat taps on the table pick the target. */
export function PowerPanel(props: PowerPanelProps) {
  const { formatMessage } = props;
  const { animation, sound } = useApp();
  onMount(() => {
    if (props.power === 'policyPeek' && props.peek.length > 0) {
      sound.play('peek-flip');
    }
  });
  const needsAck = () =>
    props.power === 'policyPeek' || props.investigation != null;

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

        <Show when={props.power === 'policyPeek'}>
          <div class={styles.policyCards}>
            <For each={props.peek}>
              {(policy, index) => (
                <span
                  classList={{
                    [styles.policyCard]: true,
                    [styles.policyLiberal]: policy === 'liberal',
                    [styles.policyFascist]: policy === 'fascist',
                  }}
                  ref={(element) =>
                    void animation.play(element, 'card-flip-in', {
                      delay: index() * 150,
                      fill: 'backwards',
                    })
                  }
                >
                  {formatMessage(`game.${policy}`)}
                </span>
              )}
            </For>
          </div>
        </Show>

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

        <Show when={needsAck()}>
          <button
            type="button"
            class={styles.powerContinue}
            onClick={() => {
              if (props.power === 'policyPeek') sound.play('peek-done');
              props.onContinue();
            }}
          >
            {formatMessage('game.power.continue')}
          </button>
        </Show>
      </Show>
    </div>
  );
}
