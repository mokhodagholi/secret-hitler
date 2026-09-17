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
  /** Hide the smoke while bots play. Skip stays. */
  lifted?: boolean;
  /** Step back one look beat. Hidden on the first beat when omitted/false. */
  onPrevious?: () => void;
  showPrevious?: boolean;
  /** Label on Continue. Defaults to onboard.continue. */
  continueLabel?: string;
  /** Punch-out lets the widget below receive taps (composer, etc.). */
  passHole?: boolean;
  /** Remeasure when docked chrome (chat height) moves. */
  layoutKey?: number;
}

function PassBars(props: { hole: HoleRect }) {
  const hole = () => props.hole;
  return (
    <>
      <div
        class={styles.block}
        style={{
          top: '0',
          left: '0',
          right: '0',
          height: `${Math.max(0, hole().top)}px`,
          bottom: 'auto',
        }}
      />
      <div
        class={styles.block}
        style={{
          top: `${hole().top + hole().height}px`,
          left: '0',
          right: '0',
          bottom: '0',
          height: 'auto',
        }}
      />
      <div
        class={styles.block}
        style={{
          top: `${hole().top}px`,
          left: '0',
          width: `${Math.max(0, hole().left)}px`,
          height: `${hole().height}px`,
          right: 'auto',
          bottom: 'auto',
        }}
      />
      <div
        class={styles.block}
        style={{
          top: `${hole().top}px`,
          left: `${hole().left + hole().width}px`,
          right: '0',
          width: 'auto',
          height: `${hole().height}px`,
          bottom: 'auto',
        }}
      />
    </>
  );
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
/** Keep the chat ring off the screen edge and under Continue. */
const CHAT_EDGE = 20;
const CHAT_TOP_GAP = 52;

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

    if (props.target === 'chat' || props.target === 'composer') {
      const topGap = props.target === 'chat' ? CHAT_TOP_GAP : 10;
      const holeLeft = Math.max(CHAT_EDGE, left - overlayBox.left + 6);
      const holeTop = top - overlayBox.top + topGap;
      const holeRight = Math.min(
        overlayBox.width - CHAT_EDGE,
        right - overlayBox.left - 6,
      );
      const holeBottom = Math.min(
        overlayBox.height - CHAT_EDGE,
        bottom - overlayBox.top - 6,
      );
      setHoles([
        {
          left: holeLeft,
          top: holeTop,
          width: Math.max(0, holeRight - holeLeft),
          height: Math.max(0, holeBottom - holeTop),
        },
      ]);
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
    props.layoutKey;
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
      <Show when={!props.lifted}>
        <>
      <Show
        when={props.passHole && holes()[0]}
        fallback={
          <div
            classList={{
              [styles.block]: true,
              [styles.blockDim]: holes().length === 0,
            }}
          />
        }
      >
        {(rect) => <PassBars hole={rect()} />}
      </Show>
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
              classList={{ [styles.holePass]: props.passHole === true }}
              style={holeStyle(rect)}
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => {
                if (props.showContinue === false || props.passHole) return;
                props.onContinue();
              }}
            />
          )}
        </For>
      </Show>
        </>
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
              {props.continueLabel ?? props.formatMessage('onboard.continue')}
            </button>
          </Show>
        </div>
      </div>
    </div>
  );
}
