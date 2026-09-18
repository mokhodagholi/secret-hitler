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
  /** Hide Skip while Daniel's header is still typing. Defaults to shown. */
  showSkip?: boolean;
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

function skipDescendants(target: string): boolean {
  return (
    target === 'chat' ||
    target === 'messages' ||
    target === 'composer' ||
    target === 'nominateAction' ||
    target === 'mic' ||
    target === 'settings' ||
    target === 'homeSettings' ||
    target === 'homeHistory' ||
    target === 'historyAdd' ||
    target === 'historySent' ||
    target === 'historyClose' ||
    target === 'historySheet' ||
    target === 'historyLoss'
  );
}

/** One gold ring per node — role chips, friend-status chips. */
function punchEachNode(target: string): boolean {
  return (
    target === 'historyRole' ||
    target === 'historyTie' ||
    target === 'historySent'
  );
}

/** Ring sits on the element's own box, not a padded union of children. */
function fitWrapper(target: string): boolean {
  return target === 'historySheet' || target === 'historyLoss';
}

function tightSettingsHole(target: string): boolean {
  return (
    target === 'nominateAction' ||
    target === 'settings' ||
    target === 'homeSettings' ||
    target === 'homeHistory' ||
    target === 'historyClose'
  );
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
/** Match-history cards / sheet use the small card radius. */
const WRAPPER_PAD = 2;
const WRAPPER_RADIUS = 8;
/** Pop-in and card-enter are transform; remasure after they land. */
const REMEASURE_AFTER_MS = [80, 280, 360] as const;
/** Keep the chat ring off the screen edge. Continue sits under the panel. */
const CHAT_EDGE = 20;
const CHAT_INSET = 10;

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
  const [passRect, setPassRect] = createSignal<HoleRect | null>(null);
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  let overlay: HTMLDivElement | undefined;
  let layoutObserver: ResizeObserver | undefined;

  const punchNodes = (
    nodes: NodeListOf<Element>,
    overlayBox: DOMRect,
    pad: number,
  ): HoleRect[] => {
    const punched: HoleRect[] = [];
    nodes.forEach((node) => {
      const box = node.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return;
      punched.push({
        left: box.left - overlayBox.left - pad,
        top: box.top - overlayBox.top - pad,
        width: box.width + pad * 2,
        height: box.height + pad * 2,
      });
    });
    return punched;
  };

  const watchLayout = () => {
    const root = overlay?.parentElement;
    if (!root || typeof ResizeObserver === 'undefined') return;
    layoutObserver?.disconnect();
    layoutObserver = new ResizeObserver(measure);
    layoutObserver.observe(root);
    root.querySelectorAll('[data-spotlight-layout]').forEach((node) => {
      layoutObserver!.observe(node);
    });
    root
      .querySelectorAll(`[data-tutorial-target="${props.target}"]`)
      .forEach((node) => {
        layoutObserver!.observe(node);
      });
  };

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
      setPassRect(null);
      return;
    }

    if (punchEachNode(props.target)) {
      setHoles(punchNodes(nodes, overlayBox, HOLE_PAD));
      setPassRect(null);
      return;
    }

    if (fitWrapper(props.target)) {
      setHoles(punchNodes(nodes, overlayBox, WRAPPER_PAD));
      setPassRect(null);
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
      // Chat messages scroll out of the panel; folding them grows the ring.
      if (skipDescendants(props.target)) {
        return;
      }
      node.querySelectorAll('*').forEach((child) => {
        absorb(child.getBoundingClientRect());
      });
    });

    if (!found) {
      setHoles([]);
      setPassRect(null);
      return;
    }

    if (props.target === 'composer') {
      const visual: HoleRect = {
        left: left - overlayBox.left,
        top: top - overlayBox.top,
        width: right - left,
        height: bottom - top,
      };
      setHoles([visual]);
      setPassRect(visual);
      return;
    }

    if (tightSettingsHole(props.target)) {
      const visual: HoleRect = {
        left: left - overlayBox.left - 6,
        top: top - overlayBox.top - 4,
        width: right - left + 12,
        height: bottom - top + 8,
      };
      setHoles([visual]);
      setPassRect(visual);
      return;
    }

    setPassRect(null);

    if (
      props.target === 'chat' ||
      props.target === 'messages' ||
      props.target === 'mic'
    ) {
      const holeLeft = Math.max(CHAT_EDGE, left - overlayBox.left + 6);
      const holeTop = top - overlayBox.top + CHAT_INSET;
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
    watchLayout();
    const frame = requestAnimationFrame(measure);
    onCleanup(() => cancelAnimationFrame(frame));
    window.addEventListener('scroll', measure, true);
    onCleanup(() => window.removeEventListener('scroll', measure, true));
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
      layoutObserver?.disconnect();
      window.removeEventListener('resize', measure);
    });
  });

  createEffect(() => {
    props.target;
    props.layoutKey;
    measure();
    watchLayout();
    const frame = requestAnimationFrame(measure);
    let follow = 0;
    const queued = requestAnimationFrame(() => {
      follow = requestAnimationFrame(() => {
        measure();
        watchLayout();
      });
    });
    const timers = REMEASURE_AFTER_MS.map((ms) =>
      window.setTimeout(() => {
        measure();
        watchLayout();
      }, ms),
    );
    onCleanup(() => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(queued);
      cancelAnimationFrame(follow);
      timers.forEach((id) => window.clearTimeout(id));
    });
  });

  const holeRadius = () =>
    fitWrapper(props.target) ? WRAPPER_RADIUS : HOLE_RADIUS;

  const holeStyle = (rect: HoleRect) => ({
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    'border-radius': `${holeRadius()}px`,
  });

  // Same moments Continue / Skip stay off: header still typing, or a table action.
  const freezeRing = () =>
    props.showContinue === false || props.showSkip === false;

  const maskId = 'look-spotlight-mask';

  return (
    <div class={styles.root} ref={(element) => (overlay = element)}>
      <Show when={!props.lifted}>
        <>
      <Show
        when={props.passHole && (passRect() ?? holes()[0])}
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
                    rx={props.target === 'composer' ? 0 : holeRadius()}
                    ry={props.target === 'composer' ? 0 : holeRadius()}
                    fill="#000"
                  />
                )}
              </For>
            </mask>
          </defs>
          <rect
            class={styles.maskFill}
            x="0"
            y="0"
            width={size().width}
            height={size().height}
            mask={`url(#${maskId})`}
          />
        </svg>
        <For each={holes()}>
          {(rect) => (
            <button
              type="button"
              classList={{
                [styles.hole]: true,
                [styles.holePass]: props.passHole === true,
                [styles.holeFlush]: props.target === 'composer',
                [styles.holeStatic]: freezeRing(),
              }}
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
        <Show when={props.showSkip !== false}>
          <button type="button" class={styles.skip} onClick={() => props.onSkip()}>
            {props.formatMessage('onboard.skip')}
          </button>
        </Show>
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
