import {
  createContext,
  createEffect,
  on,
  onCleanup,
  useContext,
  type ParentProps,
} from 'solid-js';
import { NavigationService } from './NavigationService';
import { SettingsService } from './SettingsService';
import { I18nService } from './I18nService';
import { WebSocketService } from './WebSocketService';
import { GameStateService } from './GameStateService';
import { SoundService } from './SoundService';
import { AnimationService } from './AnimationService';
import { RaviService } from './RaviService';
import { BaleService } from './BaleService';
import { PrefetchService, urlsForNextStep } from './prefetch';
import { FeatureFlagService } from './FeatureFlagService';
import { VoiceService } from './VoiceService';
import { nextMusicCheckMs, trackForScene } from './music';

export interface AppServices {
  nav: NavigationService;
  settings: SettingsService;
  i18n: I18nService;
  socket: WebSocketService;
  game: GameStateService;
  sound: SoundService;
  animation: AnimationService;
  ravi: RaviService;
  bale: BaleService;
  prefetch: PrefetchService;
  flags: FeatureFlagService;
  voice: VoiceService;
}

const AppContext = createContext<AppServices>();

export function AppProvider(
  props: ParentProps<{ services?: Partial<AppServices> }>,
) {
  // Tests inject fakes (e.g. a socket that never connects); the app uses real ones.
  const overrides = props.services ?? {};
  const settings = overrides.settings ?? new SettingsService();
  const socket = overrides.socket ?? new WebSocketService();
  const i18n = overrides.i18n ?? new I18nService(() => settings.settings.language);
  const flags = overrides.flags ?? new FeatureFlagService();
  const prefetch = overrides.prefetch ?? new PrefetchService();
  const services: AppServices = {
    nav: overrides.nav ?? new NavigationService(),
    settings,
    i18n,
    socket,
    game: overrides.game ?? new GameStateService(socket),
    sound: overrides.sound ?? new SoundService(settings, prefetch),
    animation: overrides.animation ?? new AnimationService(settings),
    ravi: overrides.ravi ?? new RaviService(settings, i18n, prefetch),
    bale: overrides.bale ?? new BaleService(),
    prefetch,
    flags,
    voice: overrides.voice ?? new VoiceService(socket, flags, settings),
  };

  if (!overrides.bale) {
    void services.bale.boot(settings, services.nav).then(() => {
      if (services.bale.user() != null) return;
      void services.game.loadProfile(settings.settings.profileId).then((avatar) => {
        if (avatar != null) settings.set('avatar', avatar);
      });
    });
  }

  // Keep the document's language and reading direction in sync with the
  // active language so Persian (and any future RTL locale) renders correctly.
  createEffect(() => {
    const { documentElement } = document;
    documentElement.lang = services.i18n.lang();
    documentElement.dir = services.i18n.dir();
  });

  // Play the page-swap sound on every screen change (not the initial mount).
  createEffect(
    on(services.nav.screen, () => services.sound.play('swap-page'), {
      defer: true,
    }),
  );

  createEffect(() => {
    services.bale.syncBackButton(services.nav.canGoBack());
  });

  // Stop or resume the background loop when the Music setting is toggled.
  createEffect(() =>
    services.sound.setMusicEnabled(services.settings.settings.music),
  );

  createEffect(() => {
    // Store read belongs here — VoiceService.sync is a class method and would not subscribe.
    void services.flags.flags.voice;
    services.voice.sync(services.game.view());
  });
  createEffect(() =>
    services.voice.setListenEnabled(services.settings.settings.voiceEnabled),
  );

  // One looping bed per room. Chat / menu / players keep whatever is playing.
  createEffect(() => {
    const scene = {
      screen: services.nav.screen(),
      roomClosed: services.game.roomClosedNotice() != null,
      view: services.game.view(),
      logs: services.game.logEntries(),
    };
    services.sound.playMusic(trackForScene(scene));
    services.prefetch.prefetch(
      urlsForNextStep({
        scene,
        raviWho: services.settings.settings.raviWho,
        music: services.settings.settings.music,
        raviVoice: services.settings.settings.raviVoice,
        soundEffects: services.settings.settings.soundEffects,
      }),
    );
    const wait = nextMusicCheckMs(scene);
    if (wait == null) return;
    const id = setTimeout(() => {
      services.sound.playMusic(
        trackForScene({
          screen: services.nav.screen(),
          roomClosed: services.game.roomClosedNotice() != null,
          view: services.game.view(),
          logs: services.game.logEntries(),
        }),
      );
    }, wait);
    onCleanup(() => clearTimeout(id));
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
