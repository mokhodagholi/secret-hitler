import { Index } from 'solid-js';
import type { BoardState } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { EagleEmblem } from '../../components/Emblem/EagleEmblem';
import { Icon } from '../../components/Icon/Icon';
import { CARD_BACK } from '../../assets/cards';
import styles from './PolicyBoard.module.scss';

export interface PolicyBoardProps {
  board: BoardState;
  formatMessage: FormatMessage;
}

const LIBERAL_SLOTS = 5;
const FASCIST_SLOTS = 6;

/**
 * The table-top policy board: face-down draw/discard stacks and both policy
 * tracks, filled left to right. Counters and the election tracker live in the
 * info panel to keep the main view minimal.
 */
export function PolicyBoard(props: PolicyBoardProps) {
  const { formatMessage } = props;
  return (
    <div class={styles.board}>
      <div class={styles.piles}>
        <CardStack
          count={props.board.drawPile}
          label={formatMessage('game.drawPile')}
        />
        <CardStack
          count={props.board.discardPile}
          label={formatMessage('game.discardPile')}
        />
      </div>

      <div classList={{ [styles.track]: true, [styles.trackLiberal]: true }}>
        <span class={styles.trackLabel}>{formatMessage('game.liberal')}</span>
        <div class={styles.slots}>
          <Index each={Array.from({ length: LIBERAL_SLOTS })}>
            {(_slot, index) => (
              <span
                classList={{
                  [styles.slot]: true,
                  [styles.slotFilled]: index < props.board.liberalPolicies,
                }}
              >
                <EagleEmblem class={styles.slotEmblem} width={26} />
              </span>
            )}
          </Index>
        </div>
      </div>

      <div classList={{ [styles.track]: true, [styles.trackFascist]: true }}>
        <span class={styles.trackLabel}>{formatMessage('game.fascist')}</span>
        <div class={styles.slots}>
          <Index each={Array.from({ length: FASCIST_SLOTS })}>
            {(_slot, index) => (
              <span
                classList={{
                  [styles.slot]: true,
                  [styles.slotFilled]: index < props.board.fascistPolicies,
                }}
              >
                <Icon name="skull" size={18} class={styles.slotEmblem} />
              </span>
            )}
          </Index>
        </div>
      </div>
    </div>
  );
}

/** A face-down pile rendered as a small stack of identical card backs. */
function CardStack(props: { count: number; label: string }) {
  return (
    <div class={styles.stack}>
      <span class={styles.stackCards}>
        <img src={CARD_BACK} alt="" class={styles.stackBack} aria-hidden="true" />
        <span class={styles.stackCount}>{props.count}</span>
      </span>
      <span class={styles.stackLabel}>{props.label}</span>
    </div>
  );
}
