import { afterEach, describe, expect, it } from '@rstest/core';
import {
  hasBaleNativeBridge,
  hasTelegramNativeBridge,
  isBaleApiVersion,
  isMessengerWebView,
  parentMessenger,
} from './miniAppHost';

describe('miniAppHost', () => {
  afterEach(() => {
    delete window.BaleWebApp;
    delete window.TelegramWebviewProxy;
    delete window.Bale;
    delete window.Telegram;
    Object.defineProperty(document, 'referrer', { configurable: true, value: '' });
  });

  it('Should treat Mini App API 1.x as Bale and 6+ as Telegram', () => {
    expect(isBaleApiVersion('1.0')).toBe(true);
    expect(isBaleApiVersion('1.4')).toBe(true);
    expect(isBaleApiVersion('7.0')).toBe(false);
    expect(isBaleApiVersion(undefined)).toBe(false);
  });

  it('Should read Bale web from the iframe parent, not from Telegram.initData', () => {
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'https://web.bale.ai/chat',
    });
    expect(parentMessenger()).toBe('bale');
    expect(hasBaleNativeBridge()).toBe(false);
    expect(hasTelegramNativeBridge()).toBe(false);
    expect(isMessengerWebView()).toBe(true);
  });
});
