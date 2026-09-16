import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import styles from './Spotlight.module.scss';

export interface SpotlightProps {
  target: string;
  onContinue: () => void;
  onSkip: () => void;
  formatMessage: FormatMessage;
  /** Hide Continue while the player must do a table action. */
  showContinue?: boolean;
  /** Step back one look beat. Hidden on the first beat when omitted/false. */
  onPrevious?: () => void;
  showPrevious?: boolean;
}

interface HoleRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Space between the gold ring and the punched-out widget. */
const HOLE_PAD = 8;
const HOLE_RADIUS = 12;

/**
 * Warm-smoke mask with one punched-out region. Previous / Continue / Skip sit
 * above it; the parchment header is a sibling, never covered.
 *
 * All matches for the current target share one bounding hole (e.g. president
 * + chancellor seats). Descendant boxes are folded in so absolute chrome
 * (office ribbons, ballots) stays lit.
 */
export function Spotlight(props: SpotlightProps) {
  const [holes, setHoles] = createSignal<HoleRect[]>([]);
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  let overlay: HTMLDivElement | undefined;

  const measure = () => {
    const root = overlay;
    if (!root) return;
    const overlayBox = root.getBoundingClientRect();
    setSize({ width: overlayBox.width, height: overlayBox.height });

    const nodes = root.parentElement?.querySelectorAll(
      `[data-tutorial-target="${props.target}"]`,
    );
    if (!nodes || nodes.length === 0) {
      setHoles([]);
      return;
    }

    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    let found = false;
    const absorb = (box: DOMRect) => {
      if (box.width < 1 || box.height < 1) return;
      found = true;
      left = Math.min(left, box.left);
      top = Math.min(top, box.top);
      right = Math.max(right, box.right);
      bottom = Math.max(bottom, box.bottom);
    };

    nodes.forEach((node) => {
      absorb(node.getBoundingClientRect());
      node.querySelectorAll('*').forEach((child) => {
        absorb(child.getBoundingClientRect());
      });
    });

    if (!found) {
      setHoles([]);
      return;
    }

    setHoles([
      {
        left: left - overlayBox.left - HOLE_PAD,
        top: top - overlayBox.top - HOLE_PAD,
        width: right - left + HOLE_PAD * 2,
        height: bottom - top + HOLE_PAD * 2,
      },
    ]);
  };

  onMount(() => {
    measure();
    const frame = requestAnimationFrame(measure);
    onCleanup(() => cancelAnimationFrame(frame));
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
    const frame = requestAnimationFrame(measure);
    onCleanup(() => cancelAnimationFrame(frame));
  });

  const holeStyle = (rect: HoleRect) => ({
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });

  const maskId = 'look-spotlight-mask';

  return (
    <div class={styles.root} ref={(element) => (overlay = element)}>
      <div
        classList={{
          [styles.block]: true,
          [styles.blockDim]: holes().length === 0,
        }}
      />
      <Show when={holes().length > 0}>
        <svg
          class={styles.mask}
          width={size().width}
          height={size().height}
          aria-hidden="true"
        >
          <defs>
            <mask id={maskId}>
              <rect
                x="0"
                y="0"
                width={size().width}
                height={size().height}
                fill="#fff"
              />
              <For each={holes()}>
                {(rect) => (
                  <rect
                    x={rect.left}
                    y={rect.top}
                    width={rect.width}
                    height={rect.height}
                    rx={HOLE_RADIUS}
                    ry={HOLE_RADIUS}
                    fill="#000"
                  />
                )}
              </For>
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width={size().width}
            height={size().height}
            fill="rgba(12, 8, 5, 0.55)"
            mask={`url(#${maskId})`}
          />
        </svg>
        <For each={holes()}>
          {(rect) => (
            <button
              type="button"
              class={styles.hole}
              style={holeStyle(rect)}
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => props.onContinue()}
            />
          )}
        </For>
      </Show>
      <div class={styles.chrome}>
        <button type="button" class={styles.skip} onClick={() => props.onSkip()}>
          {props.formatMessage('onboard.skip')}
        </button>
        <div class={styles.nav}>
          <Show when={props.showPrevious}>
            <button
              type="button"
              class={styles.previous}
              onClick={() => props.onPrevious?.()}
            >
              {props.formatMessage('onboard.previous')}
            </button>
          </Show>
          <Show when={props.showContinue !== false}>
            <button
              type="button"
              class={styles.continue}
              onClick={() => props.onContinue()}
            >
              {props.formatMessage('onboard.continue')}
            </button>
          </Show>
        </div>
      </div>
    </div>
  );
}
