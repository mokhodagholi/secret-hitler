import {
  createContext,
  createEffect,
  useContext,
  type ParentProps,
} from 'solid-js';
import { NavigationService } from './NavigationService';
import { SettingsService } from './SettingsService';
import { I18nService } from './I18nService';
import { WebSocketService } from './WebSocketService';
import { GameStateService } from './GameStateService';

export interface AppServices {
  nav: NavigationService;
  settings: SettingsService;
  i18n: I18nService;
  socket: WebSocketService;
  game: GameStateService;
}

const AppContext = createContext<AppServices>();

export function AppProvider(
  props: ParentProps<{ services?: Partial<AppServices> }>,
) {
  // Tests inject fakes (e.g. a socket that never connects); the app uses real ones.
  const overrides = props.services ?? {};
  const settings = overrides.settings ?? new SettingsService();
  const socket = overrides.socket ?? new WebSocketService();
  const services: AppServices = {
    nav: overrides.nav ?? new NavigationService(),
    settings,
    i18n: overrides.i18n ?? new I18nService(() => settings.settings.language),
    socket,
    game: overrides.game ?? new GameStateService(socket),
  };

  // Keep the document's language and reading direction in sync with the
  // active language so Persian (and any future RTL locale) renders correctly.
  createEffect(() => {
    const { documentElement } = document;
    documentElement.lang = services.i18n.lang();
    documentElement.dir = services.i18n.dir();
  });

  return (
    <AppContext.Provider value={services}>{props.children}</AppContext.Provider>
  );
}

export function useApp(): AppServices {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
