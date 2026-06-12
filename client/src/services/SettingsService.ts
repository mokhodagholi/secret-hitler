import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';

export interface SettingsState {
  playerCount: number;
  showRoles: boolean;
  timerEnabled: boolean;
  confirmActions: boolean;
  theme: 'classic-blue';
  music: boolean;
  soundEffects: boolean;
}

const DEFAULTS: SettingsState = {
  playerCount: 7,
  showRoles: false,
  timerEnabled: false,
  confirmActions: true,
  theme: 'classic-blue',
  music: true,
  soundEffects: true,
};

const STORAGE_KEY = 'sh:settings';
const TUTORIALS_KEY = 'sh:tutorials';

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 10;

/**
 * Holds user-facing settings as a Solid store, persisted to localStorage.
 */
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
