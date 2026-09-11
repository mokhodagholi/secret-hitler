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
 * a failed or missing `/api/flags` keeps the catalog defaults (everything off).
 */
export class FeatureFlagService {
  readonly flags: Store<FeatureFlags>;
  private readonly update: SetStoreFunction<FeatureFlags>;
  private readonly fetchImpl: typeof fetch;

  constructor(
    initial: FeatureFlags = DEFAULT_FLAGS,
    fetchImpl: typeof fetch = fetch,
  ) {
    const [flags, update] = createStore<FeatureFlags>({ ...initial });
    this.flags = flags;
    this.update = update;
    this.fetchImpl = fetchImpl;
  }

  enabled(name: FlagName): boolean {
    return this.flags[name];
  }

  async load(): Promise<void> {
    try {
      const response = await this.fetchImpl('/api/flags');
      if (!response.ok) return;
      const parsed = parseFlagsResponse(await response.json());
      if (!parsed) return;
      for (const name of FLAG_NAMES) {
        this.update(name, parsed[name]);
      }
    } catch {
      /* keep whatever we already hold — usually defaults */
    }
  }
}
