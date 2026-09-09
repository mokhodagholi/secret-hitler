import { Index } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import { CARD_BACK } from '../../assets/cards';
import styles from './DeckStrip.module.scss';

export interface DeckStripProps {
  drawCount: number;
  discardCount: number;
  electionTracker: number;
  candidateName: string;
  formatMessage: FormatMessage;
}

const TRACKER_SLOTS = 3;

/**
 * Compact rules strip: remaining policies, burned laws, the presidential
 * candidate, and failed-government marks.
 */
export function DeckStrip(props: DeckStripProps) {
  const { formatMessage } = props;
  return (
    <section class={styles.strip} aria-label={formatMessage('game.infoTitle')}>
      <div class={styles.piles}>
        <Pile
          count={props.drawCount}
          label={formatMessage('game.drawPile')}
          countLabel={formatMessage('game.pileCount', { count: props.drawCount })}
          mark="?"
        />
        <Pile
          count={props.discardCount}
          label={formatMessage('game.discardPile')}
          countLabel={formatMessage('game.pileCount', { count: props.discardCount })}
          mark="✕"
          burned
        />
      </div>

      <div class={styles.candidate}>
        <span class={styles.candidateLabel}>
          {formatMessage('game.presidentialCandidate')}
        </span>
        <span class={styles.candidateName} dir="auto">
          {props.candidateName}
        </span>
      </div>

      <div
        class={styles.tracker}
        aria-label={`${formatMessage('game.electionTracker')}: ${props.electionTracker}/3`}
      >
        <span class={styles.trackerLabel}>
          {formatMessage('game.electionTracker')}
        </span>
        <span class={styles.marks}>
          <Index each={Array.from({ length: TRACKER_SLOTS })}>
            {(_mark, index) => (
              <span
                classList={{
                  [styles.mark]: true,
                  [styles.markFilled]: index < props.electionTracker,
                }}
              />
            )}
          </Index>
        </span>
      </div>
    </section>
  );
}

function Pile(props: {
  count: number;
  label: string;
  countLabel: string;
  mark: string;
  burned?: boolean;
}) {
  return (
    <div
      classList={{ [styles.pile]: true, [styles.burned]: !!props.burned }}
      aria-label={`${props.label}: ${props.count}`}
    >
      <span class={styles.pileCard}>
        <img src={CARD_BACK} alt="" class={styles.pileBack} />
        <span class={styles.pileMark}>{props.mark}</span>
      </span>
      <span class={styles.pileCount}>{props.countLabel}</span>
    </div>
  );
}
