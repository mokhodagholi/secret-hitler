import { For, Show } from 'solid-js';
import type {
  ExecutivePower,
  Policy,
  PublicPlayer,
} from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import styles from './GameScreen.module.scss';

export interface PowerPanelProps {
  formatMessage: FormatMessage;
  power: ExecutivePower;
  isPresident: boolean;
  presidentName: string;
  /** Top three policies, only populated for the President during Policy Peek. */
  peek: Policy[];
  /** Investigation result, only set for the President after investigating. */
  investigation: { name: string; party: 'liberal' | 'fascist' } | null;
  /** Living players the President may target (already excludes themselves). */
  targets: PublicPlayer[];
  onTarget: (playerId: string) => void;
  onContinue: () => void;
}

const HINT_KEY = {
  policyPeek: 'game.power.peekHint',
  investigate: 'game.power.investigateHint',
  execution: 'game.power.executeHint',
  specialElection: 'game.power.electHint',
} as const;

/** The President's executive-action UI during the SpecialPower phase. */
export function PowerPanel(props: PowerPanelProps) {
  const { formatMessage } = props;
  const needsTarget = () =>
    (props.power === 'investigate' && !props.investigation) ||
    props.power === 'execution' ||
    props.power === 'specialElection';

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
              {(policy) => (
                <span
                  classList={{
                    [styles.policyCard]: true,
                    [styles.policyLiberal]: policy === 'liberal',
                    [styles.policyFascist]: policy === 'fascist',
                  }}
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

        <Show when={needsTarget()}>
          <div class={styles.powerTargets}>
            <For each={props.targets}>
              {(player) => (
                <button
                  type="button"
                  class={styles.powerTarget}
                  onClick={() => props.onTarget(player.id)}
                >
                  {player.name}
                </button>
              )}
            </For>
          </div>
        </Show>

        <Show when={!needsTarget()}>
          <button
            type="button"
            class={styles.powerContinue}
            onClick={() => props.onContinue()}
          >
            {formatMessage('game.power.continue')}
          </button>
        </Show>
      </Show>
    </div>
  );
}
