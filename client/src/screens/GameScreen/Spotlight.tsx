import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import styles from './Spotlight.module.scss';

export interface SpotlightProps {
  target: string;
  onContinue: () => void;
  onSkip: () => void;
  formatMessage: FormatMessage;
}

interface HoleRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const HOLE_PAD = 10;

/**
 * Warm-smoke mask with one punched-out region. Continue and Skip sit above
 * it; the parchment header is a sibling, never covered.
 */
export function Spotlight(props: SpotlightProps) {
  const [hole, setHole] = createSignal<HoleRect | null>(null);
  let overlay: HTMLDivElement | undefined;

  const measure = () => {
    const root = overlay;
    if (!root) return;
    const nodes = root.parentElement?.querySelectorAll(
      `[data-tutorial-target="${props.target}"]`,
    );
    if (!nodes || nodes.length === 0) {
      setHole(null);
      return;
    }
    const overlayBox = root.getBoundingClientRect();
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    let found = false;
    nodes.forEach((node) => {
      const box = node.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return;
      found = true;
      left = Math.min(left, box.left);
      top = Math.min(top, box.top);
      right = Math.max(right, box.right);
      bottom = Math.max(bottom, box.bottom);
    });
    if (!found) {
      setHole(null);
      return;
    }
    setHole({
      left: left - overlayBox.left - HOLE_PAD,
      top: top - overlayBox.top - HOLE_PAD,
      width: right - left + HOLE_PAD * 2,
      height: bottom - top + HOLE_PAD * 2,
    });
  };

  onMount(() => {
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      onCleanup(() => window.removeEventListener('resize', measure));
      return;
    }
    const observer = new ResizeObserver(measure);
    if (overlay) observer.observe(overlay);
    window.addEventListener('resize', measure);
    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    });
  });

  createEffect(() => {
    props.target;
    measure();
  });

  const holeStyle = () => {
    const rect = hole();
    if (!rect) return undefined;
    return {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    };
  };

  return (
    <div class={styles.root} ref={(element) => (overlay = element)}>
      <div
        classList={{ [styles.block]: true, [styles.blockDim]: hole() == null }}
      />
      <Show when={hole()}>
        <div class={styles.dim} style={holeStyle()} />
        <button
          type="button"
          class={styles.hole}
          style={holeStyle()}
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => props.onContinue()}
        />
      </Show>
      <div class={styles.chrome}>
        <button type="button" class={styles.skip} onClick={() => props.onSkip()}>
          {props.formatMessage('onboard.skip')}
        </button>
        <button
          type="button"
          class={styles.continue}
          onClick={() => props.onContinue()}
        >
          {props.formatMessage('onboard.continue')}
        </button>
      </div>
    </div>
  );
}
