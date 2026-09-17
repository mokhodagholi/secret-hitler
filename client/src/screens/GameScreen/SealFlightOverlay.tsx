import { onCleanup, onMount } from 'solid-js';
import type { ExecutivePower } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { POWER_SEAL } from '../../assets/cards';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import { flyToTarget } from './cardFlight';
import styles from './SealFlightOverlay.module.scss';

export interface SealFlightOverlayProps {
  power: ExecutivePower;
  /** Fascist well index that just unlocked this power (0-based). */
  wellIndex: number;
  presidentId: string;
  onDone: () => void;
}

/**
 * The power seal lifts off the Fascist well and lands on the President —
 * shared table story before the power UI opens.
 */
export function SealFlightOverlay(props: SealFlightOverlayProps) {
  const { animation, sound } = useApp();
  let seal: HTMLImageElement | undefined;
  let closed = false;

  onCleanup(() => {
    closed = true;
  });

  onMount(() => {
    void animation.enqueue(async () => {
      if (closed || !seal) return;
      const from =
        document.querySelector(
          `[data-policy-well="fascist-${props.wellIndex}"]`,
        ) ?? document.querySelector('[data-policy-party="fascist"][data-filled]');
      const to = document.querySelector(`[data-seat-id="${props.presidentId}"]`);
      if (from) {
        const start = from.getBoundingClientRect();
        const here = seal.getBoundingClientRect();
        const fromX = start.left + start.width / 2 - (here.left + here.width / 2);
        const fromY = start.top + start.height / 2 - (here.top + here.height / 2);
        seal.style.transform = `translate(${fromX}px, ${fromY}px) scale(0.55)`;
        seal.style.opacity = '1';
      } else {
        seal.style.opacity = '1';
      }
      sound.play('seal-open');
      await animation.hold(180);
      if (closed) return;
      await flyToTarget(animation, seal, to, { landScale: 0.42, duration: 640 });
      if (!closed) props.onDone();
    });
  });

  return (
    <div class={styles.stage} aria-hidden="true">
      <WarmImg
        ref={(element) => {
          seal = element;
        }}
        class={styles.seal}
        src={POWER_SEAL[props.power]}
        alt=""
        data-seal-flight={props.power}
      />
    </div>
  );
}
