import { Match, Switch } from 'solid-js';
import { AppProvider, useApp } from './services/AppContext';
import { HomeScreen } from './screens/HomeScreen/HomeScreen';
import { RulesScreen } from './screens/RulesScreen/RulesScreen';
import { SettingsScreen } from './screens/SettingsScreen/SettingsScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen/PlaceholderScreen';

function Router() {
  const { nav } = useApp();
  return (
    <Switch fallback={<HomeScreen />}>
      <Match when={nav.screen() === 'home'}>
        <HomeScreen />
      </Match>
      <Match when={nav.screen() === 'rules'}>
        <RulesScreen />
      </Match>
      <Match when={nav.screen() === 'settings'}>
        <SettingsScreen />
      </Match>
      <Match when={nav.screen() === 'how-to-play'}>
        <PlaceholderScreen title="How to Play" />
      </Match>
      <Match when={nav.screen() === 'about'}>
        <PlaceholderScreen title="About" />
      </Match>
      <Match when={nav.screen() === 'play'}>
        <PlaceholderScreen title="Play" />
      </Match>
    </Switch>
  );
}

export function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
