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
const ELECTION_TRACKER_SLOTS = 3;

/**
 * The table-top policy board: face-down draw/discard stacks, both policy
 * tracks (filled left to right), the current-track counters, the election
 * tracker, and the tappable player-count chip that opens the player list.
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

      <div class={styles.footer}>
        <div class={styles.counters}>
          <span class={styles.countersLabel}>
            {formatMessage('game.currentTrack')}
          </span>
          <div class={styles.chips}>
            <span classList={{ [styles.chip]: true, [styles.chipLiberal]: true }}>
              {formatMessage('game.liberal')} {props.board.liberalPolicies}
            </span>
            <span classList={{ [styles.chip]: true, [styles.chipFascist]: true }}>
              {formatMessage('game.fascist')} {props.board.fascistPolicies}
            </span>
          </div>
        </div>

        <div class={styles.electionTracker}>
          <span class={styles.countersLabel}>
            {formatMessage('game.electionTracker')}
          </span>
          <div class={styles.trackerDots}>
            <Index each={Array.from({ length: ELECTION_TRACKER_SLOTS })}>
              {(_dot, index) => (
                <span
                  classList={{
                    [styles.trackerDot]: true,
                    [styles.trackerDotOn]: index < props.board.electionTracker,
                  }}
                />
              )}
            </Index>
          </div>
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
