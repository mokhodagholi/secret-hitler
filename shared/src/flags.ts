// Typed catalog of server-owned feature flags. Adding a flag is one name
// here, one default, and one FEATURE_* env key — never a scattered boolean.

export const FLAG_NAMES = ['voice', 'publicTable'] as const;

export type FlagName = (typeof FLAG_NAMES)[number];

export type FeatureFlags = Record<FlagName, boolean>;

export const DEFAULT_FLAGS: FeatureFlags = { voice: false, publicTable: false };

export interface FlagsResponse {
  flags: FeatureFlags;
}

/** `publicTable` → `FEATURE_PUBLIC_TABLE`. `voice` → `FEATURE_VOICE`. */
function envKey(name: FlagName): string {
  return `FEATURE_${name.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`;
}

/**
 * Read `FEATURE_<NAME>` from a string map (typically `process.env`).
 * Missing or empty keeps the default. Only `true` / `1` (any case) turn a
 * flag on; any other present value is off. Unknown keys are ignored.
 */
export function parseFeatureFlags(
  source: Record<string, string | undefined>,
): FeatureFlags {
  const flags = { ...DEFAULT_FLAGS };
  for (const name of FLAG_NAMES) {
    const raw = source[envKey(name)];
    if (raw == null || raw.trim() === '') continue;
    const value = raw.trim().toLowerCase();
    flags[name] = value === 'true' || value === '1';
  }
  return flags;
}

/** Catalog-only copy so a response never leaks extra keys. */
export function toFlagsResponse(flags: FeatureFlags): FlagsResponse {
  const rebuilt = { ...DEFAULT_FLAGS };
  for (const name of FLAG_NAMES) {
    rebuilt[name] = flags[name];
  }
  return { flags: rebuilt };
}

/** Rebuild known booleans from a JSON body. Null when the shape is wrong. */
export function parseFlagsResponse(value: unknown): FeatureFlags | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.flags !== 'object' || record.flags === null) return null;
  const incoming = record.flags as Record<string, unknown>;
  const flags = { ...DEFAULT_FLAGS };
  for (const name of FLAG_NAMES) {
    if (typeof incoming[name] === 'boolean') flags[name] = incoming[name];
  }
  return flags;
}
