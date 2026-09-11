export type VersionBump = 'major' | 'minor' | 'patch';
export type ChangeKind = 'feat' | 'fix';

export interface ChangelogChange {
  kind: ChangeKind;
  fa: string;
  en: string;
}

export interface ChangelogRelease {
  version: string;
  bump: VersionBump;
  date: string;
  changes: ChangelogChange[];
}

const SEEN_KEY = 'sh:seen-changelog';
const BUMPS = new Set<VersionBump>(['major', 'minor', 'patch']);
const KINDS = new Set<ChangeKind>(['feat', 'fix']);

/** Semver `major.minor.patch` — anything else is treated as `0.0.0`. */
export function parseVersion(value: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareVersions(left: string, right: string): number {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  for (let index = 0; index < 3; index++) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] > rightParts[index] ? 1 : -1;
    }
  }
  return 0;
}

export function bumpVersion(current: string, bump: VersionBump): string {
  const [major, minor, patch] = parseVersion(current);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Releases strictly newer than `seen`, in the file's newest-first order. */
export function releasesSince(
  releases: readonly ChangelogRelease[],
  seen: string,
): ChangelogRelease[] {
  return releases.filter((release) => compareVersions(release.version, seen) > 0);
}

export function parseChangelog(raw: unknown): ChangelogRelease[] {
  if (raw == null || typeof raw !== 'object') return [];
  const releases = (raw as { releases?: unknown }).releases;
  if (!Array.isArray(releases)) return [];
  const parsed: ChangelogRelease[] = [];
  for (const entry of releases) {
    const release = parseRelease(entry);
    if (release) parsed.push(release);
  }
  return parsed;
}

export function readSeenVersion(
  storage: Pick<Storage, 'getItem'> | null = defaultStorage(),
): string | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(SEEN_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeSeenVersion(
  version: string,
  storage: Pick<Storage, 'setItem'> | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(SEEN_KEY, version);
  } catch {
    /* private mode */
  }
}

/** First visit marks the running version so a fresh install is not a "what's new". */
export function rememberCurrentIfUnseen(current: string): void {
  if (readSeenVersion() == null) writeSeenVersion(current);
}

export async function fetchRemoteChangelog(
  fetchImpl: typeof fetch = fetch,
): Promise<ChangelogRelease[]> {
  try {
    const response = await fetchImpl(`/changelog.json?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return [];
    return parseChangelog(await response.json());
  } catch {
    return [];
  }
}

function parseRelease(raw: unknown): ChangelogRelease | null {
  if (raw == null || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.version !== 'string' || typeof record.date !== 'string') return null;
  if (typeof record.bump !== 'string' || !BUMPS.has(record.bump as VersionBump)) return null;
  if (!Array.isArray(record.changes) || record.changes.length === 0) return null;
  const changes: ChangelogChange[] = [];
  for (const change of record.changes) {
    const parsed = parseChange(change);
    if (parsed) changes.push(parsed);
  }
  if (changes.length === 0) return null;
  return {
    version: record.version,
    bump: record.bump as VersionBump,
    date: record.date,
    changes,
  };
}

function parseChange(raw: unknown): ChangelogChange | null {
  if (raw == null || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.kind !== 'string' || !KINDS.has(record.kind as ChangeKind)) return null;
  if (typeof record.fa !== 'string' || record.fa.trim().length === 0) return null;
  if (typeof record.en !== 'string' || record.en.trim().length === 0) return null;
  return { kind: record.kind as ChangeKind, fa: record.fa, en: record.en };
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
