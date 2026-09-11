import { afterEach, describe, expect, it } from '@rstest/core';
import type { BaleWebApp } from '../bale';
import { BaleService } from './BaleService';
import { NavigationService } from './NavigationService';
import { SettingsService } from './SettingsService';

function fakeWebApp(overrides: Partial<BaleWebApp> = {}): BaleWebApp {
  return {
    initData: '',
    initDataUnsafe: {},
    ready: () => {},
    expand: () => {},
    BackButton: { show: () => {}, hide: () => {}, onClick: () => {} },
    ...overrides,
  };
}

class NativeBackBale extends BaleService {
  usesNativeBack(): boolean {
    return true;
  }
}

describe('BaleService', () => {
  afterEach(() => {
    delete window.Bale;
  });

  it('Should not use native back on localhost even when a WebApp is present', () => {
    window.Bale = { WebApp: fakeWebApp() };
    const bale = new BaleService();
    expect(bale.isMiniApp()).toBe(true);
    expect(bale.usesNativeBack()).toBe(false);
  });

  it('Should not expand the mini-app shell on boot', async () => {
    const expanded: boolean[] = [];
    window.Bale = {
      WebApp: fakeWebApp({
        expand: () => {
          expanded.push(true);
        },
      }),
    };
    await new BaleService().boot(new SettingsService(), new NavigationService('/'));
    expect(expanded).toEqual([]);
  });

  it('Should hide the native back control on home and show it off home', async () => {
    const shown: boolean[] = [];
    window.Bale = {
      WebApp: fakeWebApp({
        BackButton: {
          show: () => shown.push(true),
          hide: () => shown.push(false),
          onClick: () => {},
        },
      }),
    };
    const bale = new NativeBackBale();
    const nav = new NavigationService('/');
    await bale.boot(new SettingsService(), nav);
    expect(shown).toEqual([false]);

    bale.syncBackButton(true);
    expect(shown).toEqual([false, true]);
  });

  it('Should send the shared back action when the native control is pressed', async () => {
    let onClick: (() => void) | undefined;
    window.Bale = {
      WebApp: fakeWebApp({
        BackButton: {
          show: () => {},
          hide: () => {},
          onClick: (callback) => {
            onClick = callback;
          },
        },
      }),
    };
    const bale = new BaleService();
    const nav = new NavigationService('/');
    nav.navigate('settings');
    await bale.boot(new SettingsService(), nav);
    expect(typeof onClick).toBe('function');
    onClick?.();
    expect(nav.screen()).toBe('home');
  });
});
