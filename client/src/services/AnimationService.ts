import { ANIMATIONS, type AnimationName } from '../animations/registry';
import type { SettingsService } from './SettingsService';

// jsdom (and SSR) have no Web Animations API or matchMedia; degrade to no-ops.
// Query the OS preference once and reuse it — `matchMedia` allocates a new
// MediaQueryList per call, and `motionEnabled()` runs on every timer tick.
const reducedMotionQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

/** One paint frame from now; falls back to a macrotask where rAF is missing. */
const nextFrame: (callback: () => void) => void =
  typeof requestAnimationFrame === 'function'
    ? (callback) => requestAnimationFrame(() => callback())
    : (callback) => setTimeout(callback, 0);

/**
 * Owns all game animation playback. Components never call `element.animate`
 * directly — they `play(...)` a registry-named animation, and multi-beat
 * sequences (reveal → hold → exit) go through `enqueue` so story beats never
 * overlap. Gated at the source on the Reduce Motion setting and the OS-level
 * `prefers-reduced-motion`, so callers never check either themselves: a
 * disabled animation resolves immediately and the UI lands in its final state.
 */
export class AnimationService {
  /** Promise-chained FIFO — each enqueued beat starts after the previous ends. */
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly settings: SettingsService) {}

  /** False when the user (or their OS) asked for reduced motion. */
  motionEnabled(): boolean {
    if (this.settings.settings.reduceMotion) return false;
    return !reducedMotionQuery?.matches;
  }

  /**
   * Run a registered animation on an element. Resolves when it finishes —
   * immediately when motion is disabled, the element is missing, or the
   * environment has no Web Animations API.
   */
  play(
    element: HTMLElement | null | undefined,
    name: AnimationName,
    overrides?: KeyframeAnimationOptions,
  ): Promise<void> {
    if (!element || !this.motionEnabled() || typeof element.animate !== 'function') {
      return Promise.resolve();
    }
    // Solid refs fire before insertion; animating a disconnected element can
    // hang pending at its first keyframe (invisible content). Defer one frame
    // and animate only once the element is actually in the document.
    if (!element.isConnected) {
      return new Promise((resolve) => {
        nextFrame(() => {
          if (element.isConnected) {
            this.run(element, name, overrides).then(resolve);
          } else {
            resolve(); // never mounted — leave it at its natural state
          }
        });
      });
    }
    return this.run(element, name, overrides);
  }

  private run(
    element: HTMLElement,
    name: AnimationName,
    overrides?: KeyframeAnimationOptions,
  ): Promise<void> {
    const { keyframes, options } = ANIMATIONS[name];
    // Promote to the compositor for the animation only (project rule).
    element.style.willChange = 'transform, opacity';
    const animation = element.animate(keyframes, { ...options, ...overrides });
    return animation.finished
      .catch(() => {}) // cancelled mid-flight (e.g. unmount) is not an error
      .finally(() => {
        element.style.willChange = '';
      })
      .then(() => {});
  }

  /** Suspense pause between beats. Skipped entirely when motion is disabled. */
  hold(durationMs: number): Promise<void> {
    if (!this.motionEnabled()) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  /**
   * Append a multi-beat sequence to the global queue. Beats run strictly in
   * arrival order, one at a time, so simultaneous game events tell their story
   * sequentially instead of animating over each other. A failing step is
   * swallowed — an animation bug must never wedge the queue or the UI.
   */
  enqueue(step: () => Promise<void> | void): Promise<void> {
    const run = this.queue.then(() => Promise.resolve(step())).catch(() => {});
    this.queue = run;
    return run;
  }
}
