import { createSignal, type Accessor } from 'solid-js';
import { isLocalBaleHost } from './bale-mock';
import type { NavigationService } from './NavigationService';
import type { SettingsService } from './SettingsService';
import { joinCodeFromStartApp } from './startApp';

export interface BaleUser {
  id: number;
  firstName: string;
}

/**
 * Mini-app session: detects `window.Bale.WebApp`, validates initData on the
 * server, and locks the player name to the Bale first name.
 */
export class BaleService {
  readonly user: Accessor<BaleUser | null>;
  private readonly setUser: (user: BaleUser | null) => void;
  private rawInitData: string | null = null;

  constructor() {
    const [user, setUser] = createSignal<BaleUser | null>(null);
    this.user = user;
    this.setUser = setUser;
  }

  isMiniApp(): boolean {
    return typeof window !== 'undefined' && window.Bale?.WebApp != null;
  }

  /** Real Bale WebView — not the localhost mock, where native chrome is invisible. */
  usesNativeBack(): boolean {
    return this.isMiniApp() && !isLocalBaleHost();
  }

  syncBackButton(canGoBack: boolean): void {
    const webApp = typeof window !== 'undefined' ? window.Bale?.WebApp : undefined;
    if (!webApp || !this.usesNativeBack()) return;
    if (canGoBack) webApp.BackButton.show();
    else webApp.BackButton.hide();
  }

  /** Raw `initData` string to send on create/join so the bot can /invite. */
  initData(): string | undefined {
    return this.rawInitData ?? undefined;
  }

  async boot(settings: SettingsService, nav: NavigationService): Promise<void> {
    const webApp = typeof window !== 'undefined' ? window.Bale?.WebApp : undefined;
    if (!webApp) return;

    webApp.ready();
    webApp.expand();
    webApp.BackButton.onClick(() => nav.requestBack());
    this.syncBackButton(nav.canGoBack());

    const joinCode = joinCodeFromStartApp(webApp.initDataUnsafe?.start_param);
    if (joinCode) nav.offerJoinCode(joinCode);

    const initData = webApp.initData?.trim();
    if (!initData) return;
    this.rawInitData = initData;

    let response: Response;
    try {
      response = await fetch('/api/auth/bale', {
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
