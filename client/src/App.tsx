import { For, Match, Show, Switch, createEffect, onCleanup, onMount, createSignal, type ParentProps } from 'solid-js';
import { Phase } from '@secret-hitler/shared';
import { AppProvider, useApp, type AppServices } from './services/AppContext';
import { HomeScreen } from './screens/HomeScreen/HomeScreen';
import { PlayerCardsScreen } from './screens/PlayerCardsScreen/PlayerCardsScreen';
import { RulesScreen } from './screens/RulesScreen/RulesScreen';
import { RulesLessonScreen } from './screens/RulesScreen/RulesLessonScreen';
import { VideoTutorialScreen } from './screens/RulesScreen/VideoTutorialScreen';
import { TextTutorialScreen } from './screens/RulesScreen/TextTutorialScreen';
import { isGuideScreen, topicFromScreen } from './screens/RulesScreen/topics';
import { SettingsScreen } from './screens/SettingsScreen/SettingsScreen';
import { RoomsScreen } from './screens/RoomsScreen/RoomsScreen';
import { WaitingRoomScreen } from './screens/WaitingRoomScreen/WaitingRoomScreen';
import { GameScreen } from './screens/GameScreen/GameScreen';
import { SplashScreen } from './screens/SplashScreen/SplashScreen';
import { SPLASH_PROGRESS_MS } from './screens/SplashScreen/progress';
import { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog';
import { ConnectionNotice } from './components/ConnectionNotice/ConnectionNotice';
import { UpdateModal } from './components/UpdateModal/UpdateModal';
import { WhatsNewModal } from './components/WhatsNewModal/WhatsNewModal';
import { ChangelogScreen } from './screens/ChangelogScreen/ChangelogScreen';
import { SupportScreen } from './screens/SupportScreen/SupportScreen';
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
          : game.roomClosedNotice() === 'AFK'
            ? 'roomClosed.afk'
            : 'roomClosed.hostLeft',
      )}
      confirmLabel={formatMessage('common.ok')}
      onConfirm={() => game.clearRoomClosedNotice()}
    />
  );
}

function PlayGameClaimer() {
  const { nav, game, miniApp } = useApp();
  onMount(() => {
    const claim = nav.peekPlaySeat();
    if (!claim) return;
    void game
      .claimPlaySeat(claim.code, claim.seat, miniApp.initData())
      .then(() => {
        nav.consumePlaySeat();
        nav.navigate('waiting-room');
      })
      .catch(() => {
        nav.consumePlaySeat();
      });
  });
  return null;
}

/**
 * Waiting-room owns lobby → board. The guide unmounts that screen, so a
 * start while reading would otherwise leave them in the lessons.
 */
function FollowMatchStart() {
  const { nav, game, sound } = useApp();
  let seenPhase: Phase | null = null;
  let seenRoomId: string | null = null;

  createEffect(() => {
    const state = game.view();
    const session = game.currentSession();
    if (!state || !session || state.roomId !== session.roomId) {
      seenPhase = null;
      seenRoomId = null;
      return;
    }
    if (seenRoomId !== state.roomId) {
      seenPhase = null;
      seenRoomId = state.roomId;
    }
    const previous = seenPhase;
    seenPhase = state.phase;
    if (state.phase === Phase.Lobby) return;
    if (previous !== Phase.Lobby) return;
    const screen = nav.screen();
    if (!isGuideScreen(screen) && screen !== 'home' && screen !== 'settings') return;
    sound.play('room-start');
    game.clearError();
    nav.navigate('game');
  });
  return null;
}

function Router() {
  const { nav } = useApp();
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
      <Match when={nav.screen() === 'rules-video'}>
        <VideoTutorialScreen />
      </Match>
      <Match when={nav.screen() === 'rules-text'}>
        <TextTutorialScreen />
      </Match>
      <Match when={topicFromScreen(nav.screen())}>
        {(topicId) => (
          // Remount so Screen can play screen-enter when the topic changes.
          <For each={[topicId()]}>
            {(id) => <RulesLessonScreen topicId={id} />}
          </For>
        )}
      </Match>
      <Match when={nav.screen() === 'settings'}>
        <SettingsScreen />
      </Match>
      <Match when={nav.screen() === 'changelog'}>
        <ChangelogScreen />
      </Match>
      <Match when={nav.screen() === 'support'}>
        <SupportScreen />
      </Match>
      <Match when={nav.screen() === 'play'}>
        <RoomsScreen initialTab="join" />
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
  const { prefetch, settings, nav, flags, game, tutorial } = useApp();
  const [booting, setBooting] = createSignal(!skip);
  const [offline, setOffline] = createSignal(false);
  let startBoot = () => {};

  const offerGuide = () => {
    tutorial.offerAfterSplash(nav, game.inRoom() || nav.peekPlaySeat() != null);
  };

  onMount(() => {
    if (skip) {
      void prefetch.boot([]);
      offerGuide();
      return;
    }
    let cancelled = false;
    let finished = false;
    let running = false;
    let hangTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (finished || cancelled) return;
      finished = true;
      // Route before the lectern lifts so the first paint is the guide, not home.
      offerGuide();
      setBooting(false);
    };

    const run = async () => {
      if (running || finished || cancelled) return;
      running = true;
      setOffline(false);
      try {
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
          screen: nav.screen(),
          avatar: settings.settings.avatar,
        });
        const bootStarted = Date.now();
        await Promise.all([
          prefetch.boot(urls).catch(() => undefined),
          flags.load(),
        ]);
        if (cancelled || finished) return;
        // Cached files finish in one tick; keep the lectern until the bar can count 0 → 100.
        const wait = SPLASH_PROGRESS_MS - (Date.now() - bootStarted);
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
        <PlayGameClaimer />
        <FollowMatchStart />
        <Router />
        <RoomClosedNotice />
        <ConnectionNotice />
        <UpdateModal />
        <WhatsNewModal />
      </BootGate>
    </AppProvider>
  );
}
