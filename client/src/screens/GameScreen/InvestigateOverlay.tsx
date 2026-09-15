import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import type { Faction } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import type { FormatMessage } from '../../i18n';
import { CARD_BACK, PARTY_FACE } from '../../assets/cards';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import styles from './InvestigateOverlay.module.scss';

const NOTICE_MS =
  import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test'
    ? 200
    : 10_000;

export interface InvestigateOverlayProps {
  targetId: string;
  targetName: string;
  /** Party face — President and the investigated player. Everyone else sees the back. */
  party: Faction | null;
  /**
   * President-only: whisper the party and show the result caption.
   */
  announce?: boolean;
  onContinue: () => void;
  formatMessage: FormatMessage;
}

/**
 * A membership card lifts off the investigated seat and lands centre-stage.
 * The President and the investigated player see the party face. Spectators
 * watch the back. Only the President hears which party it was.
 */
export function InvestigateOverlay(props: InvestigateOverlayProps) {
  const { formatMessage } = props;
  const { animation, ravi, sound } = useApp();
  const [face, setFace] = createSignal<'back' | 'party'>('back');
  const [ready, setReady] = createSignal(false);
  let card: HTMLImageElement | undefined;
  let closed = false;

  const announce = () => props.announce !== false && props.party != null;

  onCleanup(() => {
    closed = true;
  });

  onMount(() => {
    void animation.enqueue(async () => {
      if (closed) return;
      sound.play('party-slide');
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
        sound.play('card-flip');
        await animation.play(card, 'card-flip-face');
        if (closed) return;
        setReady(true);
        if (announce()) {
          ravi.cancel();
          void ravi.speak(
            props.party === 'liberal'
              ? 'power.investigatedLiberal'
              : 'power.investigatedFascist',
          );
        }
        await linger();
        if (!closed) props.onContinue();
      } else {
        await linger();
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
        <WarmImg
          class={styles.card}
          src={shownParty() ? PARTY_FACE[shownParty()!] : CARD_BACK}
          alt={shownParty() ? formatMessage(`game.${shownParty()!}`) : ''}
          ref={(element) => (card = element)}
        />
        <Show when={ready() && announce() ? shownParty() : undefined}>
          {(party) => (
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
          )}
        </Show>
      </div>
    </div>
  );
}

function linger(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, NOTICE_MS));
}
