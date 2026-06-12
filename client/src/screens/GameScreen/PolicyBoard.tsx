import { Index } from 'solid-js';
import type { BoardState } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { EagleEmblem } from '../../components/Emblem/EagleEmblem';
import { Icon } from '../../components/Icon/Icon';
import styles from './PolicyBoard.module.scss';

export interface PolicyBoardProps {
  board: BoardState;
  formatMessage: FormatMessage;
}

const LIBERAL_SLOTS = 5;
const FASCIST_SLOTS = 6;
const ELECTION_TRACKER_SLOTS = 3;

/**
 * The table-top policy board: draw/discard piles, both policy tracks, the
 * current-track counters and the election tracker (three failed elections
 * enact the top policy and pass the presidency on).
 */
export function PolicyBoard(props: PolicyBoardProps) {
  const { formatMessage } = props;
  return (
    <div class={styles.board}>
      <div class={styles.piles}>
        <div classList={{ [styles.pile]: true, [styles.pileDraw]: true }}>
          <EagleEmblem class={styles.pileEmblem} width={34} />
          <span class={styles.pileCount}>{props.board.drawPile}</span>
          <span class={styles.pileLabel}>{formatMessage('game.drawPile')}</span>
        </div>
        <div classList={{ [styles.pile]: true, [styles.pileDiscard]: true }}>
          <Icon name="skull" size={22} class={styles.pileEmblem} />
          <span class={styles.pileCount}>{props.board.discardPile}</span>
          <span class={styles.pileLabel}>{formatMessage('game.discardPile')}</span>
        </div>
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
  );
}
