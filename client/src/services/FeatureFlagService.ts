import { createSignal, type Accessor } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import {
  DEFAULT_FLAGS,
  FLAG_NAMES,
  parseFlagsResponse,
  type FeatureFlags,
  type FlagName,
} from '@secret-hitler/shared';

/**
 * Server-owned flags, fetched once at boot. Callers use {@link enabled};
 * a failed or missing `/api/flags` keeps the catalog defaults. Splash
 * waits on {@link ready} so Join does not hide Create before the salon
 * flag is known; `publicTable` also defaults off.
 */
export class FeatureFlagService {
  readonly flags: Store<FeatureFlags>;
  /** False until the first {@link load} settles (or a test {@link markReady}). */
  readonly ready: Accessor<boolean>;
  private readonly update: SetStoreFunction<FeatureFlags>;
  private readonly setReady: (ready: boolean) => void;
  private readonly fetchImpl: typeof fetch;
  private inflight: Promise<void> | null = null;

  constructor(
    initial: Partial<FeatureFlags> = DEFAULT_FLAGS,
    fetchImpl: typeof fetch = fetch,
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
  }

  load(): Promise<void> {
    if (!this.inflight) this.inflight = this.pull();
    return this.inflight;
  }

  private async pull(): Promise<void> {
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await this.fetchImpl('/api/flags', { cache: 'no-store' });
          if (!response.ok) continue;
          const parsed = parseFlagsResponse(await response.json());
          if (parsed) {
            this.apply(parsed);
            return;
          }
        } catch {
          /* proxy not up yet — try again */
        }
      }
    } finally {
      this.setReady(true);
    }
  }
}
