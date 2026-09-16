import { Index, createEffect } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { CARD_BACK } from '../../assets/cards';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import styles from './DeckStrip.module.scss';

export interface DeckStripProps {
  drawCount: number;
  discardCount: number;
  electionTracker: number;
  formatMessage: FormatMessage;
}

const TRACKER_SLOTS = 3;

/**
 * Compact rules strip: remaining policies, burned laws, and
 * failed-government marks.
 */
export function DeckStrip(props: DeckStripProps) {
  const { formatMessage } = props;
  return (
    <section
      class={styles.strip}
      aria-label={formatMessage('game.infoTitle')}
      data-tutorial-target="deck"
    >
      <div class={styles.piles}>
        <Pile
          count={props.drawCount}
          label={formatMessage('game.drawPile')}
          countLabel={formatMessage('game.pileCount', { count: props.drawCount })}
          mark="?"
          pile="draw"
        />
        <Pile
          count={props.discardCount}
          label={formatMessage('game.discardPile')}
          countLabel={formatMessage('game.pileCount', { count: props.discardCount })}
          mark="✕"
          burned
          pile="discard"
        />
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
  pile: 'draw' | 'discard';
}) {
  const { animation } = useApp();
  let countEl: HTMLSpanElement | undefined;
  let seenCount: number | null = null;

  createEffect(() => {
    const count = props.count;
    if (seenCount == null) {
      seenCount = count;
      return;
    }
    if (seenCount === count) return;
    seenCount = count;
    void animation.play(countEl, 'count-tick');
  });

  return (
    <div
      classList={{ [styles.pile]: true, [styles.burned]: !!props.burned }}
      aria-label={`${props.label}: ${props.count}`}
      data-pile={props.pile}
    >
      <span class={styles.pileCard}>
        <WarmImg src={CARD_BACK} alt="" class={styles.pileBack} />
        <span class={styles.pileMark}>{props.mark}</span>
      </span>
      <span class={styles.pileCount} ref={(element) => (countEl = element)}>
        {props.countLabel}
      </span>
    </div>
  );
}
