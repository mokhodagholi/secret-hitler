import type { JSX } from 'solid-js';

const pressedTargets = new WeakSet<EventTarget>();

/**
 * Mini App WebViews often skip `click` while a WAAPI flip/pop is still
 * pending. Table choices commit on the press itself; `click` is a fallback
 * for keyboards and tests that don't fire pointer events.
 */
export function commitOnPress(
  commit: () => void,
): Pick<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'onPointerDown' | 'onClick'> {
  return {
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      pressedTargets.add(event.currentTarget);
      commit();
    },
    onClick: (event) => {
      if (pressedTargets.has(event.currentTarget)) {
        pressedTargets.delete(event.currentTarget);
        return;
      }
      commit();
    },
  };
}
