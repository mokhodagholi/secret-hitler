import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import type { Faction } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import type { FormatMessage } from '../../i18n';
import { CARD_BACK, PARTY_FACE } from '../../assets/cards';
import styles from './InvestigateOverlay.module.scss';

export interface InvestigateOverlayProps {
  targetId: string;
  targetName: string;
  /** Party face is private to the President. */
  party: Faction | null;
  onContinue: () => void;
  formatMessage: FormatMessage;
}

/**
 * A membership card lifts off the investigated seat and lands centre-stage.
 * The President then sees the party face and a caption; everyone else just
 * watches the card arrive and leave.
 */
export function InvestigateOverlay(props: InvestigateOverlayProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  const [face, setFace] = createSignal<'back' | 'party'>('back');
  const [ready, setReady] = createSignal(false);
  let card: HTMLImageElement | undefined;
  let closed = false;

  onCleanup(() => {
    closed = true;
  });

  onMount(() => {
    void animation.enqueue(async () => {
      if (closed) return;
      const from = document.querySelector(`[data-seat-id="${props.targetId}"]`);
      if (card?.isConnected && from) {
        const start = from.getBoundingClientRect();
        const here = card.getBoundingClientRect();
        const fromX = start.left + start.width / 2 - (here.left + here.width / 2);
        const fromY = start.top + start.height / 2 - (here.top + here.height / 2);
        await animation.playCustom(
          card,
          [
            {
              opacity: 1,
              transform: `translate(${fromX}px, ${fromY}px) scale(0.42)`,
            },
            { opacity: 1, transform: 'translate(0px, 0px) scale(1)' },
          ],
          { duration: 700, easing: 'ease-in-out' },
        );
      }
      if (closed) return;
      // Read live props — the private party can arrive after the public log.
      if (props.party) {
        setFace('party');
        await animation.play(card, 'card-flip-face');
        if (!closed) setReady(true);
      } else {
        await animation.play(card, 'policy-exit');
        if (!closed) props.onContinue();
      }
    });
  });

  const shownParty = () => (face() === 'party' ? props.party : null);

  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <div class={styles.stage}>
        <img
          class={styles.card}
          src={shownParty() ? PARTY_FACE[shownParty()!] : CARD_BACK}
          alt={shownParty() ? formatMessage(`game.${shownParty()!}`) : ''}
          ref={(element) => (card = element)}
        />
        <Show when={ready() ? shownParty() : undefined}>
          {(party) => (
            <>
              <span
                classList={{
                  [styles.result]: true,
                  [styles.resultLiberal]: party() === 'liberal',
                  [styles.resultFascist]: party() === 'fascist',
                }}
              >
                {formatMessage('game.power.investigationResult', {
                  name: props.targetName,
                  party: formatMessage(`game.${party()}`),
                })}
              </span>
              <button
                type="button"
                class={styles.continue}
                onClick={props.onContinue}
              >
                {formatMessage('game.power.continue')}
              </button>
            </>
          )}
        </Show>
      </div>
    </div>
  );
}
