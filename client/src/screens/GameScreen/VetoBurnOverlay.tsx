import { onCleanup, onMount } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { CARD_BACK } from '../../assets/cards';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import { flyToTarget, pileEl } from './cardFlight';
import styles from './VetoBurnOverlay.module.scss';

export interface VetoBurnOverlayProps {
  chancellorId: string;
  onDone: () => void;
}

/**
 * Public veto theater: both remaining law backs leave the Chancellor and
 * burn on the discard pile. Colour stays hidden.
 */
export function VetoBurnOverlay(props: VetoBurnOverlayProps) {
  const { animation, sound } = useApp();
  const cards: (HTMLImageElement | undefined)[] = [];
  let closed = false;

  onCleanup(() => {
    closed = true;
  });

  onMount(() => {
    void animation.enqueue(async () => {
      if (closed) return;
      const from = document.querySelector(`[data-seat-id="${props.chancellorId}"]`);
      const discard = pileEl('discard');
      sound.play('policy-burn');
      for (let index = 0; index < 2; index++) {
        if (closed) return;
        const card = cards[index];
        if (card && from) {
          const start = from.getBoundingClientRect();
          const here = card.getBoundingClientRect();
          const fromX = start.left + start.width / 2 - (here.left + here.width / 2);
          const fromY = start.top + start.height / 2 - (here.top + here.height / 2);
          card.style.transform = `translate(${fromX}px, ${fromY}px) scale(0.42)`;
          card.style.opacity = '1';
        }
        await flyToTarget(animation, card, discard, {
          landScale: 0.28,
          duration: 520,
        });
        if (card) card.style.opacity = '0';
        if (index === 0) sound.play('policy-burn');
      }
      if (!closed) props.onDone();
    });
  });

  return (
    <div class={styles.stage} aria-hidden="true">
      <WarmImg
        ref={(element) => {
          cards[0] = element;
        }}
        class={styles.card}
        src={CARD_BACK}
        alt=""
      />
      <WarmImg
        ref={(element) => {
          cards[1] = element;
        }}
        class={styles.card}
        src={CARD_BACK}
        alt=""
      />
    </div>
  );
}
