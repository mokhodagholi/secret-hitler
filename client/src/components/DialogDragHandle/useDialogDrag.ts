import { createSignal } from 'solid-js';

const INTERACTIVE =
  'button, a, input, textarea, select, option, [role="button"], [data-no-drag]';

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE) != null;
}

/**
 * Pointer-drag offset for an in-game panel. The handle owns the gesture;
 * apply `style()` to a wrapper around the dialog so pop-in animations on
 * the dialog itself keep using `transform`. `surfaceProps` drag from empty
 * panel chrome without stealing clicks from buttons and cards.
 */
export function useDialogDrag() {
  const [offset, setOffset] = createSignal({ x: 0, y: 0 });
  const [dragging, setDragging] = createSignal(false);
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let active = false;

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    if (typeof target.setPointerCapture === 'function') {
      target.setPointerCapture(event.pointerId);
    }
    active = true;
    setDragging(true);
    startX = event.clientX;
    startY = event.clientY;
    originX = offset().x;
    originY = offset().y;
  }

  function onSurfacePointerDown(event: PointerEvent): void {
    if (isInteractiveTarget(event.target)) return;
    onPointerDown(event);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!active) return;
    setOffset({
      x: originX + event.clientX - startX,
      y: originY + event.clientY - startY,
    });
  }

  function onPointerUp(): void {
    if (!active) return;
    active = false;
    setDragging(false);
  }

  const moveProps = {
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onLostPointerCapture: onPointerUp,
  };

  return {
    dragging,
    style: () => ({
      transform: `translate(${offset().x}px, ${offset().y}px)`,
    }),
    handleProps: {
      onPointerDown,
      ...moveProps,
    },
    surfaceProps: {
      onPointerDown: onSurfacePointerDown,
      ...moveProps,
    },
  };
}
