import { afterEach, describe, expect, it } from '@rstest/core';
import { createMiniApp, TelegramMiniApp } from './miniapp';
import { NavigationService } from './NavigationService';
import { SettingsService } from './SettingsService';

function fakeTelegramWebApp(
  overrides: Partial<{
    initData: string;
    initDataUnsafe: { start_param?: string };
    ready: () => void;
    expand: () => void;
    BackButton: { show: () => void; hide: () => void; onClick: (callback: () => void) => void };
  }> = {},
) {
  return {
    initData: 'query_id=AAE',
    initDataUnsafe: {},
    ready: () => {},
    expand: () => {},
    BackButton: { show: () => {}, hide: () => {}, onClick: () => {} },
    ...overrides,
  };
}

describe('createMiniApp', () => {
  afterEach(() => {
    delete window.Bale;
    delete window.Telegram;
  });

  it('Should pick Telegram when that WebApp has signed initData', () => {
    window.Telegram = { WebApp: fakeTelegramWebApp() };
    window.Bale = {
      WebApp: {
        initData: '',
        initDataUnsafe: {},
        ready: () => {},
        expand: () => {},
        BackButton: { show: () => {}, hide: () => {}, onClick: () => {} },
      },
    };
    expect(createMiniApp().platform).toBe('telegram');
  });

  it('Should stay a browser host when the Telegram SDK is an empty shell', () => {
    window.Telegram = { WebApp: fakeTelegramWebApp({ initData: '' }) };
    expect(createMiniApp().platform).toBe('browser');
  });
});

describe('TelegramMiniApp', () => {
  afterEach(() => {
    delete window.Telegram;
  });

  it('Should not expand the Telegram shell on boot', async () => {
    const expanded: boolean[] = [];
    window.Telegram = {
      WebApp: fakeTelegramWebApp({
        expand: () => {
          expanded.push(true);
        },
      }),
    };
    await new TelegramMiniApp().boot(new SettingsService(), new NavigationService('/'));
    expect(expanded).toEqual([]);
  });
});
