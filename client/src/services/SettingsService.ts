import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import { MAX_PLAYERS, MIN_PLAYERS } from '@secret-hitler/shared';
import { DEFAULT_LANGUAGE, type Language } from '../i18n';
import type { RaviWho } from './RaviService';

export interface SettingsState {
  /** Display name used for every room you create or join. */
  profileName: string;
  playerCount: number;
  timerEnabled: boolean;
  confirmActions: boolean;
  theme: 'classic-blue';
  language: Language;
  music: boolean;
  soundEffects: boolean;
  /** Spoken Ravi lines. Subtitles still run when this is off. */
  raviVoice: boolean;
  /** Which recorded host speaks the lines. */
  raviWho: RaviWho;
  /** Collapse every animation to an instant state change. */
  reduceMotion: boolean;
}

const DEFAULTS: SettingsState = {
  profileName: '',
  playerCount: 7,
  timerEnabled: false,
  confirmActions: true,
  theme: 'classic-blue',
  language: DEFAULT_LANGUAGE,
  music: true,
  soundEffects: true,
  raviVoice: true,
  raviWho: 'farid',
  reduceMotion: false,
};

const STORAGE_KEY = 'sh:settings';
const TUTORIALS_KEY = 'sh:tutorials';

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

  cyclePlayerCount(): void {
    const next =
      this.settings.playerCount >= MAX_PLAYERS
        ? MIN_PLAYERS
        : this.settings.playerCount + 1;
    this.set('playerCount', next);
  }

  toggleTimer(): void {
    this.set('timerEnabled', !this.settings.timerEnabled);
  }

  cycleRaviWho(): void {
    this.set('raviWho', this.settings.raviWho === 'farid' ? 'dilara' : 'farid');
  }

  resetTutorials(): void {
    localStorage.removeItem(TUTORIALS_KEY);
  }

  clearLocalData(): void {
    localStorage.clear();
    this.update({ ...DEFAULTS });
  }

  private static load(): SettingsState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
  }
}
