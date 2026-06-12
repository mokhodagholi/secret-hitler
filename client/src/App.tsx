import { Match, Switch } from 'solid-js';
import { AppProvider, useApp } from './services/AppContext';
import { HomeScreen } from './screens/HomeScreen/HomeScreen';
import { RulesScreen } from './screens/RulesScreen/RulesScreen';
import { SettingsScreen } from './screens/SettingsScreen/SettingsScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen/PlaceholderScreen';
import { PlayScreen } from './screens/PlayScreen/PlayScreen';
import { CreateRoomScreen } from './screens/CreateRoomScreen/CreateRoomScreen';
import { JoinGameScreen } from './screens/JoinGameScreen/JoinGameScreen';
import { WaitingRoomScreen } from './screens/WaitingRoomScreen/WaitingRoomScreen';

function Router() {
  const { nav, i18n } = useApp();
  const { formatMessage } = i18n;
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
        <PlaceholderScreen title={formatMessage('screens.howToPlay')} />
      </Match>
      <Match when={nav.screen() === 'about'}>
        <PlaceholderScreen title={formatMessage('screens.about')} />
      </Match>
      <Match when={nav.screen() === 'play'}>
        <PlayScreen />
      </Match>
      <Match when={nav.screen() === 'create-room'}>
        <CreateRoomScreen />
      </Match>
      <Match when={nav.screen() === 'join-game'}>
        <JoinGameScreen />
      </Match>
      <Match when={nav.screen() === 'waiting-room'}>
        <WaitingRoomScreen />
      </Match>
      <Match when={nav.screen() === 'game'}>
        <PlaceholderScreen title={formatMessage('screens.play')} />
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
