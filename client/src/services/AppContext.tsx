import {
  createContext,
  createEffect,
  useContext,
  type ParentProps,
} from 'solid-js';
import { NavigationService } from './NavigationService';
import { SettingsService } from './SettingsService';
import { I18nService } from './I18nService';

export interface AppServices {
  nav: NavigationService;
  settings: SettingsService;
  i18n: I18nService;
}

const AppContext = createContext<AppServices>();

export function AppProvider(props: ParentProps) {
  const settings = new SettingsService();
  const services: AppServices = {
    nav: new NavigationService(),
    settings,
    i18n: new I18nService(() => settings.settings.language),
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
