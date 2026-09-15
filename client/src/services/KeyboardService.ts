import { createSignal, type Accessor } from 'solid-js';

/** Gap between the focused field and the top of the keyboard. */
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

function isField(node: EventTarget | null): node is HTMLInputElement | HTMLTextAreaElement {
  return node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement;
}

function visualSize(): VisualViewportSize | null {
  const visual = window.visualViewport;
  if (!visual) return null;
  return { height: visual.height, offsetTop: visual.offsetTop };
}

export function isAndroidUserAgent(
  userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): boolean {
  return /Android/i.test(userAgent);
}

/**
 * Android WebView (Bale included) dismisses the IME when a scroller moves.
 * iOS pans the visual viewport; that path still needs the inner-pane scroll.
 */
export function shouldScrollFieldIntoView(
  userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): boolean {
  return !isAndroidUserAgent(userAgent);
}

/**
 * Padding the shell by `--keyboard-inset` moves the focused field. Android
 * IME treats that as a lost caret and closes. Trust the WebView shrink
 * (`interactive-widget=resizes-content`) instead.
 */
export function shouldPadForKeyboard(
  userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): boolean {
  return !isAndroidUserAgent(userAgent);
}

/**
 * Collapsing a textarea to height 0 to measure it kills the Android IME.
 * Leave the CSS height alone there; the field can scroll internally.
 */
export function growComposerHeight(field: HTMLTextAreaElement): void {
  if (isAndroidUserAgent()) return;
  field.style.height = '0';
  field.style.height = `${field.scrollHeight}px`;
}

/**
 * Tracks the software keyboard via `visualViewport` and pads the shell with
 * `--keyboard-inset`. Never transforms a focused field — Android IME treats
 * that as a lost caret and the keyboard fights the page. See native-feel.md.
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

    if (isAndroidUserAgent()) document.documentElement.dataset.android = '';

    const sync = () => this.sync();
    const onFocusOut = () => queueMicrotask(sync);
    const visual = window.visualViewport;
    visual?.addEventListener('resize', sync);
    window.addEventListener('resize', sync);
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', onFocusOut);
    sync();

    this.unbind = () => {
      visual?.removeEventListener('resize', sync);
      window.removeEventListener('resize', sync);
      document.removeEventListener('focusin', sync);
      document.removeEventListener('focusout', onFocusOut);
      this.setInset(0);
      document.documentElement.style.removeProperty('--keyboard-inset');
      delete document.documentElement.dataset.android;
    };
  }

  stop(): void {
    this.unbind?.();
    this.unbind = null;
  }

  private sync(): void {
    const inset = shouldPadForKeyboard()
      ? keyboardOverlap(window.innerHeight, visualSize())
      : 0;
    this.setInset(inset);
    document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);

    const active = document.activeElement;
    if (isField(active)) {
      if (shouldScrollFieldIntoView()) scrollFieldIntoView(active, inset);
      return;
    }

    // iOS may leave a leftover document pan after dismiss. Never do this
    // while a field is focused — Android treats it as the caret leaving.
    if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
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
