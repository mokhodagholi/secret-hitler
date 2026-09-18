import { createSignal, type Accessor } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import {
  DEFAULT_FLAGS,
  FLAG_NAMES,
  parseFlagsResponse,
  type FeatureFlags,
  type FlagName,
} from '@secret-hitler/shared';

const BOOT_ATTEMPTS = 3;
const RETRY_PAUSE_MS =
  import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test' ? 0 : 250;
const RETRY_PAUSE_MAX_MS = 2_000;
const CONFIRM_WAVES = 4;

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Keep Window as `this` — bare `fetch` as a method throws Illegal invocation. */
const windowFetch: typeof fetch = (...args) => fetch(...args);

/**
 * Server-owned flags, fetched at boot. Callers use {@link enabled};
 * a missed `/api/flags` keeps the catalog defaults and keeps asking after
 * splash in case that first catalog was too early. Splash waits on
 * {@link ready} so Join does not hide Create before the salon flag is
 * known; `publicTable` also defaults off.
 */
export class FeatureFlagService {
  readonly flags: Store<FeatureFlags>;
  /** False until the first {@link load} settles (or a test {@link markReady}). */
  readonly ready: Accessor<boolean>;
  private readonly update: SetStoreFunction<FeatureFlags>;
  private readonly setReady: (ready: boolean) => void;
  private readonly fetchImpl: typeof fetch;
  private inflight: Promise<void> | null = null;
  private gotCatalog = false;
  private confirmWaves = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private nextWaveMs = RETRY_PAUSE_MS;

  constructor(
    initial: Partial<FeatureFlags> = DEFAULT_FLAGS,
    fetchImpl: typeof fetch = windowFetch,
  ) {
    const [flags, update] = createStore<FeatureFlags>({
      ...DEFAULT_FLAGS,
      ...initial,
    });
    const [ready, setReady] = createSignal(false);
    this.flags = flags;
    this.update = update;
    this.ready = ready;
    this.setReady = setReady;
    this.fetchImpl = fetchImpl;
    if (import.meta.env.DEV) {
      (window as unknown as { __flags?: FeatureFlagService }).__flags = this;
    }
  }

  enabled(name: FlagName): boolean {
    return this.flags[name];
  }

  /** Tests inject a catalog and skip splash — treat it as already fetched. */
  markReady(): void {
    this.setReady(true);
  }

  apply(next: FeatureFlags): void {
    for (const name of FLAG_NAMES) {
      this.update(name, next[name]);
    }
    this.gotCatalog = true;
    this.clearRetry();
  }

  load(): Promise<void> {
    if (!this.inflight) this.inflight = this.pull();
    return this.inflight;
  }

  private async pull(): Promise<void> {
    try {
      for (let attempt = 0; attempt < BOOT_ATTEMPTS; attempt++) {
        if (attempt > 0) await wait(RETRY_PAUSE_MS);
        if (await this.tryFetch()) break;
      }
    } finally {
      this.setReady(true);
      this.inflight = null;
      this.armRetry();
    }
  }

  private async tryFetch(): Promise<boolean> {
    try {
      const response = await this.fetchImpl('/api/flags', { cache: 'no-store' });
      if (!response.ok) return false;
      const parsed = parseFlagsResponse(await response.json());
      if (!parsed) return false;
      this.apply(parsed);
      return true;
    } catch {
      // Proxy / server often is not up on the first splash tick.
      return false;
    }
  }

  private armRetry(): void {
    if (RETRY_PAUSE_MS === 0 || this.retryTimer != null) return;
    if (this.gotCatalog && this.confirmWaves >= CONFIRM_WAVES) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.gotCatalog) this.confirmWaves += 1;
      void this.load();
      this.nextWaveMs = Math.min(this.nextWaveMs * 2, RETRY_PAUSE_MAX_MS);
    }, this.nextWaveMs);
  }

  private clearRetry(): void {
    if (this.retryTimer == null) return;
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }
}
