import { afterEach, describe, expect, it } from '@rstest/core';
import { BaleMiniApp, createMiniApp, TelegramMiniApp } from './miniapp';
import { NavigationService } from './NavigationService';
import { SettingsService } from './SettingsService';

function fakeTelegramWebApp(
  overrides: Partial<{
    initData: string;
    version: string;
    initDataUnsafe: { start_param?: string };
    ready: () => void;
    expand: () => void;
    disableVerticalSwipes: () => void;
    setHeaderColor: (color: string) => void;
    setBackgroundColor: (color: string) => void;
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

function fakeBaleWebApp(
  initData = '',
  overrides: {
    startParam?: string;
    version?: string;
    isIframe?: boolean;
    isMiniAppSupported?: boolean;
  } = {},
) {
  return {
    initData,
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
    delete window.BaleWebApp;
  });

  it('Should pick Bale on the Bale web client even if Telegram parsed the hash', () => {
    window.Telegram = { WebApp: fakeTelegramWebApp({ version: '1.0' }) };
    window.Bale = {
      WebApp: fakeBaleWebApp('query_id=BALE', {
        version: '1.0',
        isIframe: true,
        isMiniAppSupported: true,
      }),
    };
    expect(createMiniApp().platform).toBe('bale');
  });

  it('Should pick Telegram when both SDKs parsed a Telegram-generation hash', () => {
    window.Telegram = { WebApp: fakeTelegramWebApp({ version: '7.0' }) };
    window.Bale = {
      WebApp: fakeBaleWebApp('query_id=BALE', { version: '7.0', isIframe: true }),
    };
    expect(createMiniApp().platform).toBe('telegram');
  });

  it('Should pick Telegram when that WebApp has signed initData', () => {
    window.Telegram = { WebApp: fakeTelegramWebApp() };
    window.Bale = { WebApp: fakeBaleWebApp() };
    expect(createMiniApp().platform).toBe('telegram');
  });

  it('Should pick Bale when the native bridge is present even if Telegram parsed the hash', () => {
    window.BaleWebApp = { postEvent: () => {} };
    window.Telegram = { WebApp: fakeTelegramWebApp() };
    window.Bale = { WebApp: fakeBaleWebApp('query_id=BALE') };
    expect(createMiniApp().platform).toBe('bale');
  });

  it('Should not call Telegram-only chrome when Bale owns the WebView', async () => {
    const telegramOnly = { swipes: 0, header: 0, background: 0, back: 0 };
    window.BaleWebApp = { postEvent: () => {} };
    window.Bale = { WebApp: fakeBaleWebApp('query_id=BALE') };
    window.Telegram = {
      WebApp: fakeTelegramWebApp({
        disableVerticalSwipes: () => {
          telegramOnly.swipes += 1;
        },
        setHeaderColor: () => {
          telegramOnly.header += 1;
        },
        setBackgroundColor: () => {
          telegramOnly.background += 1;
        },
        BackButton: {
          show: () => {
            telegramOnly.back += 1;
          },
          hide: () => {},
          onClick: () => {},
        },
      }),
    };
    await createMiniApp().boot(new SettingsService(), new NavigationService('/'));
    expect(telegramOnly).toEqual({ swipes: 0, header: 0, background: 0, back: 0 });
  });

  it('Should stay a browser host when the Telegram SDK is an empty shell', () => {
    window.Telegram = { WebApp: fakeTelegramWebApp({ initData: '' }) };
    expect(createMiniApp().platform).toBe('browser');
  });
});

describe('BaleMiniApp', () => {
  afterEach(() => {
    delete window.Bale;
  });

  it('Should take a Bale startParam when initDataUnsafe has no start_param', async () => {
    window.Bale = {
      WebApp: fakeBaleWebApp('query_id=BALE', { startParam: 'ABC123' }),
    };
    const nav = new NavigationService('/');
    await new BaleMiniApp().boot(new SettingsService(), nav);
    expect(nav.screen()).toBe('join-game');
    expect(nav.consumeJoinCode()).toBe('ABC123');
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
