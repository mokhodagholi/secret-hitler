import { For, type JSX } from 'solid-js';
import { Icon } from '../Icon/Icon';
import styles from './Swiper.module.scss';

export interface SwiperProps<T> {
  items: T[];
  /** Controlled active slide index. */
  index: number;
  onIndexChange: (index: number) => void;
  children: (item: T, index: number) => JSX.Element;
  /** Accessible labels for the navigation controls. */
  prevLabel: string;
  nextLabel: string;
  label?: string;
}

/** Past this horizontal drag distance a pointer gesture counts as a swipe. */
const SWIPE_THRESHOLD = 40;

/**
 * Controlled paginated carousel: one slide visible at a time, with arrow
 * buttons, clickable dots, and pointer-drag swiping. Slides translate on
 * `transform` only so the transition stays on the compositor thread.
 */
export function Swiper<T>(props: SwiperProps<T>) {
  let pointerStartX: number | null = null;

  const clamp = (next: number) =>
    Math.max(0, Math.min(props.items.length - 1, next));

  const go = (next: number) => {
    const target = clamp(next);
    if (target !== props.index) props.onIndexChange(target);
  };

  const onPointerDown = (event: PointerEvent) => {
    pointerStartX = event.clientX;
  };

  const onPointerUp = (event: PointerEvent) => {
    if (pointerStartX === null) return;
    const delta = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    go(props.index + (delta < 0 ? 1 : -1));
  };

  return (
    <section
      class={styles.swiper}
      aria-roledescription="carousel"
      aria-label={props.label}
    >
      <button
        type="button"
        class={`${styles.arrow} ${styles.prev}`}
        onClick={() => go(props.index - 1)}
        disabled={props.index === 0}
        aria-label={props.prevLabel}
      >
        <Icon name="arrowLeft" size={22} />
      </button>

      <div
        class={styles.viewport}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointerStartX = null)}
      >
        <div
          class={styles.track}
          style={{ transform: `translateX(-${props.index * 100}%)` }}
        >
          <For each={props.items}>
            {(item, index) => (
              <div class={styles.slide} aria-hidden={index() !== props.index}>
                {props.children(item, index())}
              </div>
            )}
          </For>
        </div>
      </div>

      <button
        type="button"
        class={`${styles.arrow} ${styles.next}`}
        onClick={() => go(props.index + 1)}
        disabled={props.index === props.items.length - 1}
        aria-label={props.nextLabel}
      >
        <Icon name="chevronRight" size={22} />
      </button>

      <div class={styles.dots} role="tablist" aria-label={props.label}>
        <For each={props.items}>
          {(_item, index) => (
            <button
              type="button"
              role="tab"
              class={styles.dot}
              classList={{ [styles.dotActive]: index() === props.index }}
              aria-selected={index() === props.index}
              aria-label={String(index() + 1)}
              onClick={() => go(index())}
            />
          )}
        </For>
      </div>
    </section>
  );
}
