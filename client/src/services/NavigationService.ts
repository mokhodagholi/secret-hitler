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
  | 'game';

/**
 * Signal-based screen switcher — no router library.
 * Keeps a history stack so headers can offer a back button.
 */
export class NavigationService {
  readonly screen: Accessor<ScreenName>;
  private readonly setScreen: Setter<ScreenName>;
  private readonly stack: ScreenName[] = [];

  constructor() {
    const [screen, setScreen] = createSignal<ScreenName>('home');
    this.screen = screen;
    this.setScreen = setScreen;
  }

  navigate(next: ScreenName): void {
    if (next === this.screen()) return;
    this.stack.push(this.screen());
    this.setScreen(next);
  }

  back(): void {
    this.setScreen(this.stack.pop() ?? 'home');
  }
}
