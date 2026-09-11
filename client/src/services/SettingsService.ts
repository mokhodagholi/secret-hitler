import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import { DEFAULT_LANGUAGE, type Language } from '../i18n';
import { RAVI_CLIPS, type RaviWho } from '../assets/sounds/ravi/clips';

export interface SettingsState {
  /** Display name used for every room you create or join. */
  profileName: string;
  /** Stable id so the server can store this browser's player card. */
  profileId: string;
  /** Index into the illustrated player-card portraits. */
  avatar: number;
  timerEnabled: boolean;
  confirmActions: boolean;
  theme: 'classic-blue';
  language: Language;
  music: boolean;
  soundEffects: boolean;
  /** Spoken Ravi lines. Subtitles still run when this is off. */
  raviVoice: boolean;
  /** Hear other players at the table. Hidden unless the voice flag is on. */
  voiceEnabled: boolean;
  /** Which recorded host speaks the lines. */
  raviWho: RaviWho;
  /** Collapse every animation to an instant state change. */
  reduceMotion: boolean;
}

const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULTS: SettingsState = {
  profileName: '',
  profileId: '',
  avatar: 0,
  timerEnabled: false,
  confirmActions: true,
  theme: 'classic-blue',
  language: DEFAULT_LANGUAGE,
  music: true,
  soundEffects: true,
  raviVoice: true,
  voiceEnabled: true,
  raviWho: 'daniel',
  reduceMotion: false,
};

const STORAGE_KEY = 'sh:settings';

/** User-facing settings as a Solid store, persisted to localStorage. */
export class SettingsService {
  readonly settings: Store<SettingsState>;
  private readonly update: SetStoreFunction<SettingsState>;

  constructor() {
    const [settings, update] = createStore(SettingsService.load());
    this.settings = settings;
    this.update = update;
  }

  set<K extends keyof SettingsState>(key: K, value: SettingsState[K]): void {
    this.update(key, value);
    this.persist();
  }

  toggleTimer(): void {
    this.set('timerEnabled', !this.settings.timerEnabled);
  }

  cycleRaviWho(): void {
    const voices = Object.keys(RAVI_CLIPS) as RaviWho[];
    const i = voices.indexOf(this.settings.raviWho);
    this.set('raviWho', voices[(i + 1) % voices.length]);
  }

  private static load(): SettingsState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const loaded = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
      if (!(loaded.raviWho in RAVI_CLIPS)) {
        loaded.raviWho = DEFAULTS.raviWho;
      }
      // Language picker is off the page; stay on Persian until it returns.
      loaded.language = DEFAULT_LANGUAGE;
      return SettingsService.withProfileId(loaded);
    } catch {
      return SettingsService.withProfileId({ ...DEFAULTS });
    }
  }

  private static withProfileId(state: SettingsState): SettingsState {
    if (PROFILE_ID.test(state.profileId)) return state;
    const next = { ...state, profileId: crypto.randomUUID() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
    return next;
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
  }
}
