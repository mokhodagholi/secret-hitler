import { createContext, useContext, type ParentProps } from 'solid-js';
import { NavigationService } from './NavigationService';
import { SettingsService } from './SettingsService';

export interface AppServices {
  nav: NavigationService;
  settings: SettingsService;
}

const AppContext = createContext<AppServices>();

export function AppProvider(props: ParentProps) {
  const services: AppServices = {
    nav: new NavigationService(),
    settings: new SettingsService(),
  };
  return (
    <AppContext.Provider value={services}>{props.children}</AppContext.Provider>
  );
}

export function useApp(): AppServices {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
