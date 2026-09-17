import { For, createSignal, onCleanup, onMount } from 'solid-js';
import type { Policy } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import type { FormatMessage } from '../../i18n';
import type { AnimationService } from '../../services/AnimationService';
import { CARD_BACK, POLICY_FACE } from '../../assets/cards';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import styles from './PeekOverlay.module.scss';

const PEEK_COUNT = 3;
const NOTICE_MS =
  import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test'
    ? 200
    : 10_000;
const TRAVEL_MS = 560;

export interface PeekOverlayProps {
  /** Faces — President only. Everyone else sees the backs. */
  policies: Policy[];
  onContinue: () => void;
  formatMessage: FormatMessage;
}

/**
 * Three laws lift off the draw pile. Spectators watch the backs; the
 * President sees the faces after they land.
 */
export function PeekOverlay(props: PeekOverlayProps) {
  const { formatMessage } = props;
  const { animation, sound } = useApp();
  const [face, setFace] = createSignal(false);
  const travelCards: (HTMLImageElement | undefined)[] = [];
  let closed = false;

  onCleanup(() => {
    closed = true;
  });

  onMount(() => {
    let finished = false;
    const finish = () => {
      if (closed || finished) return;
      finished = true;
      props.onContinue();
    };
    // Hung deal flights used to skip this overlay until the power clock timed out.
    const cap = window.setTimeout(finish, NOTICE_MS + TRAVEL_MS * PEEK_COUNT + 2_000);
    onCleanup(() => window.clearTimeout(cap));
    void animation.enqueue(async () => {
      if (closed) return;
      sound.play('policy-draw');
      const from = document.querySelector('[data-pile="draw"]');
      for (let index = 0; index < PEEK_COUNT; index++) {
        if (closed) return;
        sound.play('deal-slide');
        await flyFromPile(animation, travelCards[index], from);
      }
      if (closed) return;
      if (props.policies.length > 0) {
        setFace(true);
        sound.play('peek-flip');
        for (let index = 0; index < PEEK_COUNT; index++) {
          void animation.play(travelCards[index], 'card-flip-face', {
            delay: index * 110,
            fill: 'backwards',
          });
        }
      }
      await linger();
      window.clearTimeout(cap);
      sound.play('peek-done');
      finish();
    });
  });

  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <div class={styles.stage}>
        <For each={Array.from({ length: PEEK_COUNT })}>
          {(_card, index) => {
            const policy = () => props.policies[index()];
            const showFace = () => face() && policy() != null;
            return (
              <WarmImg
                class={styles.card}
                src={showFace() ? POLICY_FACE[policy()!] : CARD_BACK}
                alt={showFace() ? formatMessage(`game.${policy()!}`) : ''}
                ref={(element) => {
                  travelCards[index()] = element;
                }}
              />
            );
          }}
        </For>
      </div>
    </div>
  );
}

function linger(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, NOTICE_MS));
}

function centerOf(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function flyFromPile(
  animation: AnimationService,
  card: HTMLImageElement | undefined,
  from: Element | null,
): Promise<void> {
  if (!card) return Promise.resolve();
  if (!from) {
    card.style.opacity = '1';
    return Promise.resolve();
  }
  const start = centerOf(from);
  const here = centerOf(card);
  const x = start.x - here.x;
  const y = start.y - here.y;
  return animation
    .playCustom(
      card,
      [
        {
          opacity: 1,
          transform: `translate(${x}px, ${y}px) scale(0.36) rotate(-12deg)`,
        },
        { opacity: 1, transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
      ],
      { duration: TRAVEL_MS, easing: 'ease-in-out' },
    )
    .then(() => {
      card.style.opacity = '1';
      card.style.transform = '';
    });
}
