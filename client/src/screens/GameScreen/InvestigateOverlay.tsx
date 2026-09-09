import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import type { Faction } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import type { FormatMessage } from '../../i18n';
import { CARD_BACK, PARTY_FACE } from '../../assets/cards';
import styles from './InvestigateOverlay.module.scss';

export interface InvestigateOverlayProps {
  targetId: string;
  presidentId: string;
  targetName: string;
  /** Party face is private to the President. */
  party: Faction | null;
  onContinue: () => void;
  formatMessage: FormatMessage;
}

/**
 * A membership card lifts off the investigated seat, flies to the
 * President, then (for the President) flips to the party face.
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
      const from = document.querySelector(
        `[data-seat-id="${props.targetId}"]`,
      );
      const to = document.querySelector(
        `[data-seat-id="${props.presidentId}"]`,
      );
      if (card?.isConnected && from && to) {
        const start = from.getBoundingClientRect();
        const end = to.getBoundingClientRect();
        const here = card.getBoundingClientRect();
        const fromX = start.left + start.width / 2 - (here.left + here.width / 2);
        const fromY = start.top + start.height / 2 - (here.top + here.height / 2);
        const toX = end.left + end.width / 2 - (here.left + here.width / 2);
        const toY = end.top + end.height / 2 - (here.top + here.height / 2);
        await animation.playCustom(
          card,
          [
            { opacity: 1, transform: `translate(${fromX}px, ${fromY}px) scale(0.42)` },
            { opacity: 1, transform: `translate(${toX}px, ${toY}px) scale(0.95)` },
          ],
          { duration: 700, easing: 'ease-in-out' },
        );
      }
      if (closed) return;
      if (props.party) {
        setFace('party');
        await animation.play(card, 'card-flip-face');
        if (closed) return;
        await animation.hold(900);
        if (!closed) setReady(true);
      } else {
        await animation.play(card, 'policy-exit');
        if (!closed) props.onContinue();
      }
    });
  });

  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <div class={styles.stage}>
        <img
          class={styles.card}
          src={face() === 'party' && props.party ? PARTY_FACE[props.party] : CARD_BACK}
          alt=""
          ref={(element) => (card = element)}
        />
        <Show when={props.party && ready()}>
          <span class={styles.result}>
            {formatMessage('game.power.investigationResult', {
              name: props.targetName,
              party: formatMessage(`game.${props.party!}`),
            })}
          </span>
          <button
            type="button"
            class={styles.continue}
            onClick={props.onContinue}
          >
            {formatMessage('game.power.continue')}
          </button>
        </Show>
      </div>
    </div>
  );
}
