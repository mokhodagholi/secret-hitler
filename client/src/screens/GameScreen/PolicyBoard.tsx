import { Index, Show } from 'solid-js';
import {
  powerForFascistPolicy,
  type BoardState,
  type ExecutivePower,
} from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { Icon, type IconName } from '../../components/Icon/Icon';
import { POLICY_FACE } from '../../assets/cards';
import liberalBoard from '../../assets/images/liberal_board.png';
import fascistBoard from '../../assets/images/facist_board.png';
import styles from './PolicyBoard.module.scss';

export interface PolicyBoardProps {
  board: BoardState;
  playerCount: number;
  formatMessage: FormatMessage;
}

const LIBERAL_SLOTS = 5;
const FASCIST_SLOTS = 6;

const POWER_ICON: Record<ExecutivePower, IconName> = {
  investigate: 'question',
  specialElection: 'crown',
  policyPeek: 'cards',
  execution: 'skull',
};

/**
 * Liberal and Fascist tracks, using the painted board art. Enacted policy
 * cards sit in the printed wells; empty Fascist wells show the power icon.
 */
export function PolicyBoard(props: PolicyBoardProps) {
  const { formatMessage } = props;
  const last = () => props.board.lastEnacted[props.board.lastEnacted.length - 1];

  return (
    <div class={styles.board}>
      <div class={`${styles.track} ${styles.trackLiberal}`}>
        <img
          class={styles.art}
          src={liberalBoard}
          alt={formatMessage('game.liberal')}
        />
        <div class={styles.slots}>
          <Index each={Array.from({ length: LIBERAL_SLOTS })}>
            {(_slot, index) => {
              const filled = () => index < props.board.liberalPolicies;
              const glow = () =>
                filled() &&
                last() === 'liberal' &&
                index === props.board.liberalPolicies - 1;
              return (
                <span
                  classList={{
                    [styles.slot]: true,
                    [styles.slotGlow]: glow(),
                  }}
                >
                  <Show when={filled()}>
                    <img
                      class={styles.slotCard}
                      src={POLICY_FACE.liberal}
                      alt=""
                    />
                  </Show>
                </span>
              );
            }}
          </Index>
        </div>
      </div>

      <div class={`${styles.track} ${styles.trackFascist}`}>
        <img
          class={styles.art}
          src={fascistBoard}
          alt={formatMessage('game.fascist')}
        />
        <div class={styles.slots}>
          <Index each={Array.from({ length: FASCIST_SLOTS })}>
            {(_slot, index) => {
              const filled = () => index < props.board.fascistPolicies;
              const glow = () =>
                filled() &&
                last() === 'fascist' &&
                index === props.board.fascistPolicies - 1;
              const power = () =>
                index < 5
                  ? powerForFascistPolicy(props.playerCount, index + 1)
                  : null;
              return (
                <span
                  classList={{
                    [styles.slot]: true,
                    [styles.slotGlow]: glow(),
                  }}
                >
                  <Show when={filled()}>
                    <img
                      class={styles.slotCard}
                      src={POLICY_FACE.fascist}
                      alt=""
                    />
                  </Show>
                  <Show when={!filled() && power()}>
                    {(granted) => (
                      <Icon
                        name={POWER_ICON[granted()]}
                        size={14}
                        class={styles.slotEmblem}
                      />
                    )}
                  </Show>
                  <Show when={!filled() && index === FASCIST_SLOTS - 1}>
                    <Icon name="skull" size={14} class={styles.slotEmblem} />
                  </Show>
                </span>
              );
            }}
          </Index>
        </div>
      </div>
    </div>
  );
}
