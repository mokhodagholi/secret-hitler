import { createSignal, type Accessor } from 'solid-js';
import {
  DEFAULT_BALE_BOT_USERNAME,
  DEFAULT_TELEGRAM_BOT_USERNAME,
  DEFAULT_TELEGRAM_WEBAPP_SHORT_NAME,
  isLocalInviteHost,
  roomInviteLink,
  type MessengerKind,
} from '@secret-hitler/shared';
import type { NavigationService } from './NavigationService';
import type { SettingsService } from './SettingsService';
import { joinCodeFromStartApp } from './startApp';

export type MiniAppPlatform = MessengerKind | 'browser';

export interface MiniAppUser {
  id: number;
  firstName: string;
}

/** Shared WebApp chrome both Bale and Telegram expose. */
export interface HostWebApp {
  initData: string;
  initDataUnsafe?: { start_param?: string };
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
}

export interface MiniApp {
  readonly platform: MiniAppPlatform;
  readonly user: Accessor<MiniAppUser | null>;
  isMiniApp(): boolean;
  usesNativeBack(): boolean;
  syncBackButton(canGoBack: boolean): void;
  initData(): string | undefined;
  inviteLink(code: string, origin: string, hostname: string): string;
  boot(settings: SettingsService, nav: NavigationService): Promise<void>;
}

const AUTH_PATH = '/api/auth/miniapp';
const SHELL_COLOR = '#051528';

class HostMiniApp implements MiniApp {
  readonly platform: MessengerKind;
  readonly user: Accessor<MiniAppUser | null>;
  private readonly setUser: (user: MiniAppUser | null) => void;
  private rawInitData: string | null = null;
  private readonly readWebApp: () => HostWebApp | undefined;
  private readonly afterReady: (webApp: HostWebApp) => void;

  constructor(
    platform: MessengerKind,
    readWebApp: () => HostWebApp | undefined,
    afterReady: (webApp: HostWebApp) => void,
  ) {
    this.platform = platform;
    this.readWebApp = readWebApp;
    this.afterReady = afterReady;
    const [user, setUser] = createSignal<MiniAppUser | null>(null);
    this.user = user;
    this.setUser = setUser;
  }

  isMiniApp(): boolean {
    return typeof window !== 'undefined' && this.readWebApp() != null;
  }

  usesNativeBack(): boolean {
    return this.isMiniApp() && !isLocalInviteHost(location.hostname);
  }

  syncBackButton(canGoBack: boolean): void {
    const webApp = this.readWebApp();
    if (!webApp || !this.usesNativeBack()) return;
    if (canGoBack) webApp.BackButton.show();
    else webApp.BackButton.hide();
  }

  initData(): string | undefined {
    return this.rawInitData ?? undefined;
  }

  inviteLink(code: string, origin: string, hostname: string): string {
    return roomInviteLink({
      code,
      origin,
      hostname,
      platform: this.platform,
      botUsername:
        this.platform === 'telegram' ? DEFAULT_TELEGRAM_BOT_USERNAME : DEFAULT_BALE_BOT_USERNAME,
      telegramShortName: DEFAULT_TELEGRAM_WEBAPP_SHORT_NAME,
    });
  }

  async boot(settings: SettingsService, nav: NavigationService): Promise<void> {
    const webApp = this.readWebApp();
    if (!webApp) return;

    this.afterReady(webApp);
    webApp.BackButton.onClick(() => nav.requestBack());
    this.syncBackButton(nav.canGoBack());

    const joinCode = joinCodeFromStartApp(webApp.initDataUnsafe?.start_param);
    if (joinCode) nav.offerJoinCode(joinCode);

    const initData = webApp.initData?.trim();
    if (!initData) return;
    this.rawInitData = initData;

    let response: Response;
    try {
      response = await fetch(AUTH_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
    } catch {
      return;
    }
    if (!response.ok) return;

    const body = (await response.json()) as {
      id?: number;
      firstName?: string;
      avatar?: number;
    };
    if (typeof body.id !== 'number' || !body.firstName?.trim()) return;

    const user = { id: body.id, firstName: body.firstName.trim() };
    this.setUser(user);
    settings.set('profileName', user.firstName);
    if (typeof body.avatar === 'number') {
      settings.set('avatar', body.avatar);
    }
  }
}

export class BaleMiniApp extends HostMiniApp {
  constructor() {
    super(
      'bale',
      () => (typeof window !== 'undefined' ? window.Bale?.WebApp : undefined),
      (webApp) => {
        webApp.ready();
      },
    );
  }
}

export class TelegramMiniApp extends HostMiniApp {
  constructor() {
    super(
      'telegram',
      () => (typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined),
      (webApp) => {
        webApp.ready();
        webApp.disableVerticalSwipes?.();
        webApp.setHeaderColor?.(SHELL_COLOR);
        webApp.setBackgroundColor?.(SHELL_COLOR);
      },
    );
  }
}

export class BrowserMiniApp implements MiniApp {
  readonly platform = 'browser' as const;
  readonly user: Accessor<MiniAppUser | null>;

  constructor() {
    const [user] = createSignal<MiniAppUser | null>(null);
    this.user = user;
  }

  isMiniApp(): boolean {
    return false;
  }

  usesNativeBack(): boolean {
    return false;
  }

  syncBackButton(_canGoBack: boolean): void {}

  initData(): string | undefined {
    return undefined;
  }

  inviteLink(code: string, origin: string, hostname: string): string {
    return roomInviteLink({ code, origin, hostname });
  }

  async boot(): Promise<void> {}
}

/** Pick the host from signed initData. Empty SDK globals are not a WebView. */
export function createMiniApp(): MiniApp {
  if (typeof window === 'undefined') return new BrowserMiniApp();
  const telegram = window.Telegram?.WebApp;
  const bale = window.Bale?.WebApp;
  if (telegram?.initData?.trim()) return new TelegramMiniApp();
  if (bale?.initData?.trim()) return new BaleMiniApp();
  if (isLocalInviteHost(location.hostname) && bale) return new BaleMiniApp();
  return new BrowserMiniApp();
}
