import { createSignal, type Accessor } from 'solid-js';

/** Gap between the form's last action and the top of the keyboard. */
const KEYBOARD_GAP_PX = 12;
/** Ignore sub-pixel URL-bar jitter; a real keyboard is hundreds of pixels. */
const INSET_NOISE_PX = 16;

export interface VisualViewportSize {
  height: number;
  offsetTop: number;
}

/**
 * How much of the layout viewport the software keyboard covers. `offsetTop`
 * is included so an iOS visual-viewport pan is not counted twice.
 */
export function keyboardOverlap(
  layoutHeight: number,
  visual: VisualViewportSize | null | undefined,
): number {
  if (!visual) return 0;
  const overlap = layoutHeight - visual.height - visual.offsetTop;
  if (overlap < INSET_NOISE_PX) return 0;
  return Math.round(overlap);
}

/**
 * How far to translate a form up so its bottom (the action) sits just above
 * the visible viewport. Capped so the focused field (or the form top) stays
 * on screen — a lift that hides the caret is worse than a covered button.
 */
export function formShiftPx(
  formTop: number,
  formBottom: number,
  visualTop: number,
  visualBottom: number,
  gap: number = KEYBOARD_GAP_PX,
  ceilingTop: number = formTop,
): number {
  const overflow = formBottom - (visualBottom - gap);
  if (overflow <= 0) return 0;
  const maxShift = Math.max(0, ceilingTop - visualTop - gap);
  return Math.round(Math.min(overflow, maxShift));
}

function isField(node: EventTarget | null): node is HTMLInputElement | HTMLTextAreaElement {
  return node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement;
}

function visualSize(): VisualViewportSize | null {
  const visual = window.visualViewport;
  if (!visual) return null;
  return { height: visual.height, offsetTop: visual.offsetTop };
}

/**
 * Tracks the software keyboard via `visualViewport` and docks focused forms
 * above it. The `100dvh` shell is left alone — see client/docs/native-feel.md.
 */
export class KeyboardService {
  readonly inset: Accessor<number>;
  private readonly setInset: (value: number) => void;
  private unbind: (() => void) | null = null;

  constructor() {
    const [inset, setInset] = createSignal(0);
    this.inset = inset;
    this.setInset = setInset;
  }

  start(): void {
    if (this.unbind || typeof window === 'undefined') return;
    const virtual = (
      navigator as Navigator & { virtualKeyboard?: { overlaysContent: boolean } }
    ).virtualKeyboard;
    if (virtual) virtual.overlaysContent = true;

    const sync = () => this.sync();
    const onFocusOut = () => queueMicrotask(sync);
    const visual = window.visualViewport;
    visual?.addEventListener('resize', sync);
    visual?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', onFocusOut);
    sync();

    this.unbind = () => {
      visual?.removeEventListener('resize', sync);
      visual?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      document.removeEventListener('focusin', sync);
      document.removeEventListener('focusout', onFocusOut);
      if (virtual) virtual.overlaysContent = false;
      this.clearShifts();
      this.setInset(0);
      document.documentElement.style.removeProperty('--keyboard-inset');
    };
  }

  stop(): void {
    this.unbind?.();
    this.unbind = null;
  }

  private sync(): void {
    // iOS pans the document to keep a field on screen; pin the shell instead.
    if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);

    const inset = keyboardOverlap(window.innerHeight, visualSize());
    this.setInset(inset);
    document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
    this.syncForms(inset);
  }

  private syncForms(inset: number): void {
    const active = document.activeElement;
    const field = isField(active) ? active : null;

    for (const form of document.querySelectorAll<HTMLElement>('[data-keyboard-form]')) {
      if (!field || !form.contains(field)) {
        form.style.removeProperty('--keyboard-shift');
        continue;
      }
      this.liftForm(form, field, inset);
      scrollFieldIntoView(field, inset);
    }

    if (field && inset > 0 && !field.closest('[data-keyboard-form]')) {
      scrollFieldIntoView(field, inset);
    }
  }

  private liftForm(form: HTMLElement, field: HTMLElement, inset: number): void {
    const visual = window.visualViewport;
    const viewportTop = visual?.offsetTop ?? 0;
    const visualBottom = visual ? visual.offsetTop + visual.height : window.innerHeight - inset;
    const current = Number.parseFloat(form.style.getPropertyValue('--keyboard-shift')) || 0;
    const rect = form.getBoundingClientRect();
    const fieldTop = field.getBoundingClientRect().top + current;
    const scroller = scrollParent(form) ?? form.parentElement;
    const visibleTop = Math.max(viewportTop, scroller?.getBoundingClientRect().top ?? viewportTop);
    const shift = formShiftPx(
      rect.top + current,
      rect.bottom + current,
      visibleTop,
      visualBottom,
      KEYBOARD_GAP_PX,
      fieldTop,
    );
    if (shift <= 0) form.style.removeProperty('--keyboard-shift');
    else form.style.setProperty('--keyboard-shift', `${shift}px`);
  }

  private clearShifts(): void {
    for (const form of document.querySelectorAll<HTMLElement>('[data-keyboard-form]')) {
      form.style.removeProperty('--keyboard-shift');
    }
  }
}

/** Scroll the nearest pane so `field` sits above the keyboard. Never the document. */
export function scrollFieldIntoView(field: HTMLElement, inset: number): void {
  const scroller = scrollParent(field);
  if (!scroller) return;
  const fieldRect = field.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const visibleBottom = Math.min(scrollerRect.bottom, window.innerHeight - inset) - KEYBOARD_GAP_PX;
  const visibleTop = scrollerRect.top + KEYBOARD_GAP_PX;
  if (fieldRect.bottom > visibleBottom) {
    scroller.scrollTop += fieldRect.bottom - visibleBottom;
  } else if (fieldRect.top < visibleTop) {
    scroller.scrollTop -= visibleTop - fieldRect.top;
  }
}

function scrollParent(node: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = node.parentElement;
  while (current && current !== document.body && current !== document.documentElement) {
    const { overflowY } = getComputedStyle(current);
    if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}
