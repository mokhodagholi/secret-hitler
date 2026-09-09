import { Index, Show } from 'solid-js';
import type { BoardState } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { POLICY_FACE } from '../../assets/cards';
import liberalBoard from '../../assets/boards/liberal.png';
import fascistBoard from '../../assets/boards/fascist.png';
import styles from './PolicyBoard.module.scss';

export interface PolicyBoardProps {
  board: BoardState;
  formatMessage: FormatMessage;
}

const LIBERAL_SLOTS = 5;
/** The painted Fascist board has five wells; the sixth policy ends the game. */
const FASCIST_SLOTS = 5;

/**
 * Liberal and Fascist tracks, using the painted board art. Enacted policy
 * cards sit in the printed wells.
 */
export function PolicyBoard(props: PolicyBoardProps) {
  const { formatMessage } = props;

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
            {(_slot, index) => (
              <span class={styles.slot}>
                <Show when={index < props.board.liberalPolicies}>
                  <img
                    class={styles.slotCard}
                    src={POLICY_FACE.liberal}
                    alt=""
                  />
                </Show>
              </span>
            )}
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
            {(_slot, index) => (
              <span class={styles.slot}>
                <Show when={index < props.board.fascistPolicies}>
                  <img
                    class={styles.slotCard}
                    src={POLICY_FACE.fascist}
                    alt=""
                  />
                </Show>
              </span>
            )}
          </Index>
        </div>
      </div>
    </div>
  );
}
