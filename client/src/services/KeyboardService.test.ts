import { afterEach, describe, expect, it } from '@rstest/core';
import {
  KeyboardService,
  formShiftPx,
  keyboardOverlap,
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

describe('formShiftPx', () => {
  it('Should stay put when the form already clears the keyboard', () => {
    expect(formShiftPx(80, 400, 0, 500)).toBe(0);
  });

  it('Should lift the form so its bottom sits just above the visible edge', () => {
    expect(formShiftPx(200, 620, 0, 500, 12)).toBe(132);
  });

  it('Should not push the focused field off the top of the visible viewport', () => {
    expect(formShiftPx(40, 900, 0, 500, 12, 40)).toBe(28);
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

  it('Should dock a focused keyboard form above the keyboard', () => {
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
    const shifted = (top: number, bottom: number) => {
      const shift = Number.parseFloat(form.style.getPropertyValue('--keyboard-shift')) || 0;
      return {
        top: top - shift,
        bottom: bottom - shift,
        left: 0,
        right: 390,
        width: 390,
        height: bottom - top,
        x: 0,
        y: top - shift,
        toJSON() {},
      } as DOMRect;
    };
    form.getBoundingClientRect = () => shifted(200, 620);
    field.getBoundingClientRect = () => shifted(220, 264);

    const keyboard = new KeyboardService();
    keyboard.start();
    field.focus();
    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(form.style.getPropertyValue('--keyboard-shift')).toBe('132px');
    keyboard.stop();
    form.remove();
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
