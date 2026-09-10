import { Match, Switch, createEffect } from 'solid-js';
import { AppProvider, useApp, type AppServices } from './services/AppContext';
import { HomeScreen } from './screens/HomeScreen/HomeScreen';
import { RulesScreen } from './screens/RulesScreen/RulesScreen';
import { SettingsScreen } from './screens/SettingsScreen/SettingsScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen/PlaceholderScreen';
import { HowToPlayScreen } from './screens/HowToPlayScreen/HowToPlayScreen';
import { RoomsScreen } from './screens/RoomsScreen/RoomsScreen';
import { WaitingRoomScreen } from './screens/WaitingRoomScreen/WaitingRoomScreen';
import { GameScreen } from './screens/GameScreen/GameScreen';
import { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog';

/** Shown on every screen — the room can be closed under any of them. */
function RoomClosedNotice() {
  const { game, i18n, sound } = useApp();
  const { formatMessage } = i18n;
  const open = () => game.roomClosedNotice() != null;
  createEffect(() => {
    if (open()) sound.play('room-closed');
  });
  return (
    <ConfirmDialog
      open={game.roomClosedNotice() != null}
      message={formatMessage(
        game.roomClosedNotice() === 'KICKED'
          ? 'roomClosed.kicked'
          : 'roomClosed.hostLeft',
      )}
      confirmLabel={formatMessage('common.ok')}
      onConfirm={() => game.clearRoomClosedNotice()}
    />
  );
}

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
        <HowToPlayScreen />
      </Match>
      <Match when={nav.screen() === 'about'}>
        <PlaceholderScreen title={formatMessage('screens.about')} />
      </Match>
      <Match when={nav.screen() === 'play'}>
        <RoomsScreen initialTab="create" />
      </Match>
      <Match when={nav.screen() === 'create-room'}>
        <RoomsScreen initialTab="create" />
      </Match>
      <Match when={nav.screen() === 'join-game'}>
        <RoomsScreen initialTab="join" />
      </Match>
      <Match when={nav.screen() === 'waiting-room'}>
        <WaitingRoomScreen />
      </Match>
      <Match when={nav.screen() === 'game'}>
        <GameScreen />
      </Match>
    </Switch>
  );
}

export function App(props: { services?: Partial<AppServices> }) {
  return (
    <AppProvider services={props.services}>
      <Router />
      <RoomClosedNotice />
    </AppProvider>
  );
}
