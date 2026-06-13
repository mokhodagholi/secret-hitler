import { createSignal, type Accessor, type Setter } from 'solid-js';

export type ScreenName =
  | 'home'
  | 'rules'
  | 'settings'
  | 'how-to-play'
  | 'about'
  | 'play'
  | 'create-room'
  | 'join-game'
  | 'waiting-room'
  | 'game'
  | 'chat';

const JOIN_LINK_PATTERN = /^\/join\/([A-Za-z0-9]+)\/?$/;

/**
 * Signal-based screen switcher — no router library.
 * Keeps a history stack so headers can offer a back button.
 * A `/join/CODE` share link boots straight into the join screen.
 */
export class NavigationService {
  readonly screen: Accessor<ScreenName>;
  private readonly setScreen: Setter<ScreenName>;
  private readonly stack: ScreenName[] = [];
  private pendingJoinCode: string | null;

  constructor(initialPath: string = location.pathname) {
    this.pendingJoinCode = JOIN_LINK_PATTERN.exec(initialPath)?.[1] ?? null;
    const [screen, setScreen] = createSignal<ScreenName>(
      this.pendingJoinCode ? 'join-game' : 'home',
    );
    this.screen = screen;
    this.setScreen = setScreen;
    // Clean the URL so a refresh lands on the app shell, not a stale link.
    if (this.pendingJoinCode) history.replaceState(null, '', '/');
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
