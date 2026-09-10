import { For, Index, Show, createEffect, createSignal, onCleanup } from 'solid-js';
import {
  LEGISLATIVE_TRAVEL_CARD_MS,
  type Policy,
} from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import type { AnimationService } from '../../services/AnimationService';
import { CARD_BACK, POLICY_FACE } from '../../assets/cards';
import { Icon } from '../../components/Icon/Icon';
import styles from './LegislativeModal.module.scss';

export interface LegislativeModalProps {
  /** Discard one of three (President) or enact one of two (Chancellor). */
  mode: 'discard' | 'enact';
  policies: Policy[];
  presidentId: string;
  chancellorId: string | null;
  presidentName: string;
  chancellorName: string;
  secondsLeft: number;
  canVeto: boolean;
  /** Legislative window start — late joiners skip the deal/pass flight. */
  startedAt: number;
  /** Fired as each policy lifts off the draw pile so the count can tick down. */
  onDrewCard?: () => void;
  /** Draw pile is back in sync with the server (deal finished or skipped). */
  onDealCaughtUp?: () => void;
  onPick: (index: number) => void;
  onVeto: () => void;
  formatMessage: FormatMessage;
}

/** Reveal between stagger so the cards flip in one after another. */
const REVEAL_STEP_MS = 110;

type Beat = 'deal' | 'pass' | 'choose';

/**
 * Public legislative theater: face-down cards leave the draw pile for the
 * President, then two pass to the Chancellor. Only the acting legislator
 * sees the faces; everyone else watches the backs and the order.
 */
export function LegislativeModal(props: LegislativeModalProps) {
  const { formatMessage } = props;
  const { animation, ravi, sound } = useApp();
  const [picking, setPicking] = createSignal(false);
  const [beat, setBeat] = createSignal<Beat>(
    props.mode === 'discard' ? 'deal' : 'pass',
  );
  const faceCards: (HTMLButtonElement | undefined)[] = [];
  const travelCards: (HTMLImageElement | undefined)[] = [];
  let closed = false;
  let travelGen = 0;
  let seenMode: 'discard' | 'enact' | null = null;

  onCleanup(() => {
    closed = true;
    travelGen += 1;
  });

  createEffect(() => {
    const mode = props.mode;
    const previous = seenMode;
    if (previous === mode) return;
    seenMode = mode;
    void playTravel(mode, previous);
  });

  async function playTravel(
    mode: 'discard' | 'enact',
    previous: 'discard' | 'enact' | null,
  ): Promise<void> {
    const gen = ++travelGen;
    const kind: Beat = mode === 'discard' ? 'deal' : 'pass';
    // The choice clock's startedAt is when faces should be up; if it's already
    // here, the deal/pass already happened (rejoin / refresh).
    const late = props.startedAt > 0 && Date.now() >= props.startedAt;
    setPicking(false);
    setBeat(kind);
    if (late && previous == null) {
      setBeat('choose');
      props.onDealCaughtUp?.();
      speakIfHolder();
      return;
    }
    if (kind === 'deal') sound.play('policy-draw');
    await waitFrames(2);
    if (gen !== travelGen || closed) return;

    const from =
      kind === 'deal'
        ? document.querySelector('[data-pile="draw"]')
        : seatEl(props.presidentId);
    const via =
      kind === 'deal' ? seatEl(props.presidentId) : seatEl(props.chancellorId);
    const count = kind === 'deal' ? 3 : 2;
    for (let index = 0; index < count; index++) {
      if (gen !== travelGen || closed) return;
      if (kind === 'deal') props.onDrewCard?.();
      sound.play('deal-slide');
      await flyCard(animation, travelCards[index], from, via);
    }
    if (gen !== travelGen || closed) return;
    if (kind === 'deal') props.onDealCaughtUp?.();
    setBeat('choose');
    speakIfHolder();
  }

  function speakIfHolder(): void {
    if (closed || props.policies.length === 0) return;
    sound.play('card-flip');
    void ravi.speak(props.mode === 'discard' ? 'private.discard' : 'private.enact');
  }

  async function pick(index: number): Promise<void> {
    if (picking()) return;
    setPicking(true);
    if (props.mode === 'discard') sound.play('policy-burn');
    const exit = props.mode === 'enact' ? 'card-to-board' : 'policy-exit';
    await animation.play(faceCards[index], exit);
    props.onPick(index);
  }

  const showFaces = () => beat() === 'choose' && props.policies.length > 0;
  const travelCount = () => {
    if (beat() === 'deal') return 3;
    if (beat() === 'pass') return 2;
    return props.mode === 'discard' ? 3 : 2;
  };

  const title = () => {
    if (beat() === 'deal') return formatMessage('game.legislativeDeal');
    if (beat() === 'pass') return formatMessage('game.legislativePass');
    if (props.policies.length > 0) {
      return formatMessage(
        props.mode === 'discard'
          ? 'game.presidentDiscardHint'
          : 'game.chancellorEnactHint',
      );
    }
    return formatMessage(
      props.mode === 'discard' ? 'game.presidentChoosing' : 'game.chancellorChoosing',
      {
        name:
          props.mode === 'discard' ? props.presidentName : props.chancellorName,
      },
    );
  };

  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <div
        class={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title()}
        ref={(element) => void animation.play(element, 'pop-in')}
      >
        <span class={styles.title}>{title()}</span>

        <Show when={beat() === 'choose' && props.secondsLeft > 0}>
          <span
            classList={{
              [styles.timer]: true,
              [styles.urgent]: props.secondsLeft <= 4,
              [styles.pulse]: props.secondsLeft <= 4 && animation.motionEnabled(),
            }}
          >
            <Icon name="clock" size={14} />
            {formatMessage('game.secondsLeft', { seconds: props.secondsLeft })}
          </span>
        </Show>

        <div class={styles.cards}>
          <Show when={showFaces()}>
            <For each={props.policies}>
              {(policy, index) => (
                <button
                  type="button"
                  class={styles.card}
                  disabled={picking()}
                  ref={(element) => {
                    faceCards[index()] = element;
                    void animation.play(element, 'card-flip-in', {
                      delay: index() * REVEAL_STEP_MS,
                      fill: 'backwards',
                    });
                  }}
                  onClick={() => void pick(index())}
                >
                  <img
                    class={styles.cardImage}
                    src={POLICY_FACE[policy]}
                    alt={formatMessage(`game.${policy}`)}
                  />
                </button>
              )}
            </For>
          </Show>
          <Show when={!showFaces()}>
            <Index each={Array.from({ length: travelCount() })}>
              {(_card, index) => (
                <img
                  classList={{
                    [styles.travelCard]: true,
                    [styles.travelVisible]: beat() === 'choose',
                  }}
                  src={CARD_BACK}
                  alt=""
                  ref={(element) => {
                    travelCards[index] = element;
                  }}
                />
              )}
            </Index>
          </Show>
        </div>

        <Show when={showFaces() && props.canVeto}>
          <button
            type="button"
            class={styles.veto}
            disabled={picking()}
            onClick={() => props.onVeto()}
          >
            {formatMessage('game.veto.propose')}
          </button>
        </Show>
      </div>
    </div>
  );
}

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const tick = (left: number) => {
      if (left <= 0) {
        resolve();
        return;
      }
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => tick(left - 1));
        return;
      }
      setTimeout(() => tick(left - 1), 0);
    };
    tick(count);
  });
}

function escapeAttr(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&');
}

function seatEl(playerId: string | null): Element | null {
  if (!playerId) return null;
  return document.querySelector(`[data-seat-id="${escapeAttr(playerId)}"]`);
}

function centerOf(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function offsetFrom(
  card: HTMLElement,
  origin: Element | null,
): { x: number; y: number } | null {
  if (!origin) return null;
  const from = centerOf(origin);
  const here = centerOf(card);
  return { x: from.x - here.x, y: from.y - here.y };
}

function flyCard(
  animation: AnimationService,
  card: HTMLImageElement | undefined,
  from: Element | null,
  via: Element | null,
): Promise<void> {
  if (!card) return Promise.resolve();
  const start = offsetFrom(card, from);
  const mid = offsetFrom(card, via);
  if (!start) {
    card.style.opacity = '1';
    return Promise.resolve();
  }
  const tilt = mid ? 10 : -12;
  const keyframes: Keyframe[] = mid
    ? [
        {
          opacity: 1,
          transform: `translate(${start.x}px, ${start.y}px) scale(0.32) rotate(-18deg)`,
        },
        {
          opacity: 1,
          transform: `translate(${mid.x}px, ${mid.y}px) scale(0.44) rotate(${tilt}deg)`,
          offset: 0.55,
        },
        { opacity: 1, transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
      ]
    : [
        {
          opacity: 1,
          transform: `translate(${start.x}px, ${start.y}px) scale(0.32) rotate(-12deg)`,
        },
        { opacity: 1, transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
      ];
  return animation
    .playCustom(card, keyframes, {
      duration: LEGISLATIVE_TRAVEL_CARD_MS,
      easing: 'ease-in-out',
    })
    .then(() => {
      card.style.opacity = '1';
      card.style.transform = '';
    });
}
