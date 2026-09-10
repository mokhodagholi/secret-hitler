import { Match, Show, Switch, createEffect, onCleanup, onMount, createSignal, type ParentProps } from 'solid-js';
import { AppProvider, useApp, type AppServices } from './services/AppContext';
import { HomeScreen } from './screens/HomeScreen/HomeScreen';
import { PlayerCardsScreen } from './screens/PlayerCardsScreen/PlayerCardsScreen';
import { RulesScreen } from './screens/RulesScreen/RulesScreen';
import { SettingsScreen } from './screens/SettingsScreen/SettingsScreen';
import { PlaceholderScreen } from './screens/PlaceholderScreen/PlaceholderScreen';
import { HowToPlayScreen } from './screens/HowToPlayScreen/HowToPlayScreen';
import { RoomsScreen } from './screens/RoomsScreen/RoomsScreen';
import { WaitingRoomScreen } from './screens/WaitingRoomScreen/WaitingRoomScreen';
import { GameScreen } from './screens/GameScreen/GameScreen';
import { SplashScreen } from './screens/SplashScreen/SplashScreen';
import { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog';
import { UpdateModal } from './components/UpdateModal/UpdateModal';
import { criticalBootUrls } from './services/prefetch';
import { waitForOnline } from './services/online';

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
      <Match when={nav.screen() === 'player-cards'}>
        <PlayerCardsScreen />
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

function BootGate(props: ParentProps<{ skip?: boolean }>) {
  const skip = props.skip || process.env.NODE_ENV === 'test';
  const { prefetch, settings } = useApp();
  const [booting, setBooting] = createSignal(!skip);
  const [offline, setOffline] = createSignal(false);
  let startBoot = () => {};

  onMount(() => {
    if (skip) return;
    let cancelled = false;
    let finished = false;
    let running = false;
    let hangTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (finished || cancelled) return;
      finished = true;
      setBooting(false);
    };

    const run = async () => {
      if (running || finished || cancelled) return;
      running = true;
      setOffline(false);
      try {
        const started = Date.now();
        const online = await waitForOnline();
        if (cancelled || finished) return;
        if (!online) {
          setOffline(true);
          return;
        }

        hangTimer = setTimeout(finish, 15_000);
        const urls = criticalBootUrls({
          music: settings.settings.music,
          soundEffects: settings.settings.soundEffects,
        });
        await prefetch.boot(urls).catch(() => undefined);
        if (cancelled || finished) return;
        const wait = 800 - (Date.now() - started);
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        finish();
      } finally {
        running = false;
        if (hangTimer !== undefined) clearTimeout(hangTimer);
      }
    };

    startBoot = () => {
      void run();
    };
    void run();
    const onOnline = () => {
      if (offline()) startBoot();
    };
    window.addEventListener('online', onOnline);
    onCleanup(() => {
      cancelled = true;
      if (hangTimer !== undefined) clearTimeout(hangTimer);
      window.removeEventListener('online', onOnline);
    });
  });

  return (
    <Show
      when={!booting()}
      fallback={<SplashScreen offline={offline()} onRetry={() => startBoot()} />}
    >
      {props.children}
    </Show>
  );
}

export function App(props: { services?: Partial<AppServices> }) {
  return (
    <AppProvider services={props.services}>
      <BootGate skip={props.services != null}>
        <Router />
        <RoomClosedNotice />
        <UpdateModal />
      </BootGate>
    </AppProvider>
  );
}
