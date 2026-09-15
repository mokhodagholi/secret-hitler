import { afterEach, describe, expect, it } from '@rstest/core';
import {
  KeyboardService,
  keyboardOverlap,
  scrollFieldIntoView,
  shouldScrollFieldIntoView,
} from './KeyboardService';

describe('keyboardOverlap', () => {
  it('Should treat a missing visual viewport as no keyboard', () => {
    expect(keyboardOverlap(800, null)).toBe(0);
  });

  it('Should ignore URL-bar jitter under 16px', () => {
    expect(keyboardOverlap(800, { height: 790, offsetTop: 0 })).toBe(0);
  });

  it('Should measure the covered strip at the bottom of the layout viewport', () => {
    expect(keyboardOverlap(800, { height: 500, offsetTop: 0 })).toBe(300);
  });

  it('Should not double-count an iOS visual-viewport pan', () => {
    expect(keyboardOverlap(800, { height: 500, offsetTop: 80 })).toBe(220);
  });
});

describe('KeyboardService', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--keyboard-inset');
    delete (window as { visualViewport?: unknown }).visualViewport;
  });

  it('Should write --keyboard-inset from the visual viewport overlap', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: fakeViewport({ height: 500, offsetTop: 0 }),
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

    const keyboard = new KeyboardService();
    keyboard.start();
    expect(keyboard.inset()).toBe(300);
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('300px');
    keyboard.stop();
    expect(keyboard.inset()).toBe(0);
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('');
  });

  it('Should not ask Chromium to overlay the virtual keyboard', () => {
    const virtual = { overlaysContent: false };
    Object.defineProperty(navigator, 'virtualKeyboard', {
      configurable: true,
      value: virtual,
    });

    const keyboard = new KeyboardService();
    keyboard.start();
    expect(virtual.overlaysContent).toBe(false);
    keyboard.stop();
    expect(virtual.overlaysContent).toBe(false);

    delete (navigator as Navigator & { virtualKeyboard?: unknown }).virtualKeyboard;
  });

  it('Should not translate a focused form', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: fakeViewport({ height: 500, offsetTop: 0 }),
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

    const form = document.createElement('div');
    form.setAttribute('data-keyboard-form', '');
    const field = document.createElement('input');
    form.appendChild(field);
    document.body.appendChild(form);

    const keyboard = new KeyboardService();
    keyboard.start();
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(form.style.getPropertyValue('--keyboard-shift')).toBe('');
    expect(form.style.transform).toBe('');
    keyboard.stop();
    form.remove();
  });

  it('Should not scroll a parent pane on Android while a field is focused', () => {
    const previousAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Mobile Safari/537.36',
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: fakeViewport({ height: 500, offsetTop: 0 }),
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

    const scroller = document.createElement('div');
    Object.assign(scroller.style, { overflowY: 'auto', height: '200px' });
    const field = document.createElement('input');
    scroller.appendChild(field);
    document.body.appendChild(scroller);
    Object.defineProperty(scroller, 'scrollHeight', { value: 400 });
    Object.defineProperty(scroller, 'clientHeight', { value: 200 });
    scroller.scrollTop = 0;

    const keyboard = new KeyboardService();
    keyboard.start();
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(scroller.scrollTop).toBe(0);
    keyboard.stop();
    scroller.remove();
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: previousAgent,
    });
  });

  it('Should not reset window scroll while a field is focused', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: fakeViewport({ height: 500, offsetTop: 0 }),
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const scrollTo = window.scrollTo.bind(window);
    const calls: Array<[number, number]> = [];
    window.scrollTo = ((x: number, y: number) => {
      calls.push([x, y]);
    }) as typeof window.scrollTo;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 40 });
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 0 });

    const field = document.createElement('input');
    document.body.appendChild(field);
    const keyboard = new KeyboardService();
    field.focus();
    keyboard.start();

    expect(calls).toEqual([]);
    keyboard.stop();
    field.remove();
    window.scrollTo = scrollTo;
    delete (window as { scrollY?: number }).scrollY;
    delete (window as { scrollX?: number }).scrollX;
  });
});

describe('shouldScrollFieldIntoView', () => {
  it('Should skip inner-pane scroll on Android WebView', () => {
    expect(
      shouldScrollFieldIntoView(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36',
      ),
    ).toBe(false);
  });

  it('Should still scroll an inner pane on iOS', () => {
    expect(
      shouldScrollFieldIntoView(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      ),
    ).toBe(true);
  });
});

describe('scrollFieldIntoView', () => {
  it('Should scroll an overflow pane so the field clears the keyboard', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const scroller = document.createElement('div');
    Object.assign(scroller.style, { overflowY: 'auto', height: '200px' });
    const field = document.createElement('input');
    scroller.appendChild(field);
    document.body.appendChild(scroller);
    Object.defineProperty(scroller, 'scrollHeight', { value: 400 });
    Object.defineProperty(scroller, 'clientHeight', { value: 200 });
    scroller.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 800,
        left: 0,
        right: 390,
        width: 390,
        height: 800,
        x: 0,
        y: 0,
        toJSON() {},
      }) as DOMRect;
    field.getBoundingClientRect = () =>
      ({
        top: 620,
        bottom: 664,
        left: 16,
        right: 374,
        width: 358,
        height: 44,
        x: 16,
        y: 620,
        toJSON() {},
      }) as DOMRect;

    scrollFieldIntoView(field, 300);
    expect(scroller.scrollTop).toBe(176);
    scroller.remove();
  });
});

function fakeViewport(options: { height: number; offsetTop: number }) {
  return {
    height: options.height,
    offsetTop: options.offsetTop,
    addEventListener() {},
    removeEventListener() {},
  };
}
