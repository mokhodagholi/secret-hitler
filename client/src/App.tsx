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
import { OnboardingIntroScreen } from './screens/OnboardingIntroScreen/OnboardingIntroScreen';
import { MessengerOnlyScreen } from './screens/MessengerOnlyScreen/MessengerOnlyScreen';
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
  const { nav, flags, miniApp } = useApp();
  // The website is not a table. Localhost still looks like Bale because of the mock.
  if (miniApp.platform === 'browser' && !flags.flags.browserPlay) {
    return <MessengerOnlyScreen />;
  }
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
      <Match when={nav.screen() === 'onboarding'}>
        <OnboardingIntroScreen />
      </Match>
      <Match when={nav.screen() === 'game'}>
        <GameScreen />
      </Match>
    </Switch>
  );
}

function BootGate(props: ParentProps<{ skip?: boolean }>) {
  const skip = props.skip || process.env.NODE_ENV === 'test';
  const { prefetch, settings, nav, flags } = useApp();
  const [booting, setBooting] = createSignal(!skip);
  const [offline, setOffline] = createSignal(false);
  let startBoot = () => {};

  onMount(() => {
    if (skip) {
      void prefetch.boot([]);
      return;
    }
    let cancelled = false;
    let revealed = false;
    let running = false;
    let hangTimer: ReturnType<typeof setTimeout> | undefined;

    const reveal = () => {
      if (revealed || cancelled) return;
      revealed = true;
      setBooting(false);
    };

    const run = async () => {
      if (running || cancelled) return;
      running = true;
      setOffline(false);
      try {
        const online = await waitForOnline();
        if (cancelled) return;
        if (!online) {
          setOffline(true);
          return;
        }

        const urls = criticalBootUrls({
          music: settings.settings.music,
          soundEffects: settings.settings.soundEffects,
          screen: nav.screen(),
          avatar: settings.settings.avatar,
        });
        const bootStarted = Date.now();
        // Never lift splash on the hang timer before flags settle.
        const flagsDone = flags.load();
        hangTimer = setTimeout(() => {
          void flagsDone.finally(reveal);
        }, 15_000);
        await Promise.all([
          prefetch.boot(urls).catch(() => undefined),
          flagsDone,
        ]);
        if (cancelled) return;
        if (revealed) return;
        const wait = SPLASH_PROGRESS_MS - (Date.now() - bootStarted);
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        reveal();
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

function SitOffer() {
  const { tutorial, nav, i18n, settings, flags, game, ravi, miniApp } = useApp();
  const { formatMessage } = i18n;
  const websiteClosed = () => miniApp.platform === 'browser' && !flags.flags.browserPlay;
  let sitPrompted = false;

  function identity() {
    return {
      initData: miniApp.initData(),
      clientId: settings.settings.profileId,
    };
  }

  // Offer after this dialog exists. Asking during splash leaves offeringSit
  // true with no subscriber, and ConfirmDialog never sees a closed → open flip.
  createEffect(() => {
    if (websiteClosed()) return;
    // Catalog defaults onboarding on, so Sit can open even before /api/flags.
    const onboarding = flags.flags.onboarding;
    if (!onboarding) return;
    tutorial.offerAfterSplash(
      nav,
      game.inRoom() || nav.peekPlaySeat() != null,
      onboarding,
    );
  });

  const sitOpen = () =>
    !websiteClosed() && tutorial.offeringSit() && flags.flags.onboarding;
  // First splash: Sit only. Later launches (after a Not now) may defer.
  const sitRequired = () => tutorial.declineCount() === 0;

  createEffect(() => {
    if (!sitOpen()) {
      sitPrompted = false;
      return;
    }
    void ravi.speakGuide('onboard.piece.welcome');
    if (sitPrompted) return;
    sitPrompted = true;
    void game.recordOnboard('prompt', identity());
  });

  return (
    <ConfirmDialog
      open={sitOpen()}
      underBriefing
      message={formatMessage('onboard.piece.welcome')}
      confirmLabel={formatMessage('onboard.sit')}
      cancelLabel={sitRequired() ? undefined : formatMessage('onboard.notNow')}
      onConfirm={() => {
        ravi.prime();
        ravi.cancel();
        void game.recordOnboard('sit', identity());
        tutorial.startIntro({
          name: settings.settings.profileName.trim() || formatMessage('game.you'),
          avatar: settings.settings.avatar,
        });
        nav.navigate('onboarding');
      }}
      onCancel={
        sitRequired()
          ? undefined
          : () => {
              ravi.prime();
              ravi.cancel();
              void game.recordOnboard('not_now', identity());
              tutorial.declineSit();
            }
      }
    />
  );
}

export function App(props: { services?: Partial<AppServices> }) {
  return (
    <AppProvider services={props.services}>
      <BootGate skip={props.services != null}>
        <PlayGameClaimer />
        <FollowMatchStart />
        <Router />
        <SitOffer />
        <RoomClosedNotice />
        <ConnectionNotice />
        <UpdateModal />
        <WhatsNewModal />
      </BootGate>
    </AppProvider>
  );
}

