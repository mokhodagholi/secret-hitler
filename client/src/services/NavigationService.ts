import { createSignal, type Accessor, type Setter } from 'solid-js';
import { joinCodeFromStartApp } from './startApp';

export type ScreenName =
  | 'home'
  | 'rules'
  | 'settings'
  | 'changelog'
  | 'player-cards'
  | 'play'
  | 'create-room'
  | 'join-game'
  | 'waiting-room'
  | 'game';

const JOIN_LINK_PATTERN = /^\/join\/([A-Za-z0-9]+)\/?$/;

/**
 * Signal-based screen switcher — no router library.
 * Keeps a history stack so headers can offer a back button.
 * A `/join/CODE` share link boots straight into the join screen.
 */
export class NavigationService {
  readonly screen: Accessor<ScreenName>;
  readonly canGoBack: Accessor<boolean>;
  private readonly setScreen: Setter<ScreenName>;
  private readonly stack: ScreenName[] = [];
  private pendingJoinCode: string | null;
  private backHandler: (() => void) | null = null;

  constructor(initialPath: string = location.pathname) {
    const fromPath = JOIN_LINK_PATTERN.exec(initialPath)?.[1] ?? null;
    const fromQuery =
      typeof location !== 'undefined'
        ? new URLSearchParams(location.search).get('tgWebAppStartParam')
        : null;
    this.pendingJoinCode = fromPath ?? joinCodeFromStartApp(fromQuery);
    const [screen, setScreen] = createSignal<ScreenName>(
      this.pendingJoinCode ? 'join-game' : 'home',
    );
    this.screen = screen;
    this.setScreen = setScreen;
    // Deep links boot off home with an empty stack; back still returns home.
    this.canGoBack = () => this.screen() !== 'home';
    // Clean the URL so a refresh lands on the app shell, not a stale link.
    if (this.pendingJoinCode) history.replaceState(null, '', '/');
  }

  /** Leave-confirm / sheet intercept — native chrome and the in-app arrow share this. */
  setBackHandler(handler: (() => void) | null): void {
    this.backHandler = handler;
  }

  /** Ignore stale unmounts so a new screen's handler is not wiped by the previous one. */
  clearBackHandler(handler: () => void): void {
    if (this.backHandler === handler) this.backHandler = null;
  }

  requestBack(): void {
    if (this.backHandler) {
      this.backHandler();
      return;
    }
    this.back();
  }

  /** Pop to `target` instead of pushing it — pushing play after a room traps back in a loop. */
  returnTo(target: ScreenName): void {
    const index = this.stack.lastIndexOf(target);
    if (index >= 0) {
      this.stack.splice(index);
      this.setScreen(target);
      return;
    }
    if (this.screen() === target) return;
    this.stack.length = 0;
    this.setScreen(target);
  }

  /** Mini-app `startapp` / start_param — same as a `/join/CODE` share link. */
  offerJoinCode(code: string): void {
    if (this.pendingJoinCode) return;
    this.pendingJoinCode = code;
    if (this.screen() === 'home') this.setScreen('join-game');
  }

  navigate(next: ScreenName): void {
    if (next === this.screen()) return;
    this.stack.push(this.screen());
    this.setScreen(next);
  }

  back(): void {
    this.setScreen(this.stack.pop() ?? 'home');
  }

  /** Room code from a `/join/CODE` share link — claimed once by the join screen. */
  consumeJoinCode(): string | null {
    const code = this.pendingJoinCode;
    this.pendingJoinCode = null;
    return code;
  }
}
