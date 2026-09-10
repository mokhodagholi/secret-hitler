/** How often a live session asks the origin if a new build is sitting there. */
export const UPDATE_POLL_MS = 30 * 60 * 1000;

export const APP_VERSION: string =
  typeof import.meta.env.APP_VERSION === 'string' && import.meta.env.APP_VERSION.length > 0
    ? import.meta.env.APP_VERSION
    : 'dev';

export interface RemoteVersion {
  version: string;
}

/** True when the origin is serving a different build than this page. */
export function isNewerVersion(remote: string, current: string = APP_VERSION): boolean {
  return remote.length > 0 && remote !== current;
}

/** Bypass the running bundle (and the SW HTML cache) by loading a fresh document. */
export function reloadToLatest(
  assign: (url: string) => void = (href) => location.replace(href),
): void {
  const url = new URL(location.href);
  url.searchParams.set('v', String(Date.now()));
  assign(`${url.pathname}${url.search}${url.hash}`);
}

/** The prompt waits until they leave a live table. */
export function isUpdatePromptVisible(available: boolean, screen: string): boolean {
  return available && screen !== 'game';
}

/** Fetch `/version.json` with no cache. `null` if the probe fails. */
export async function fetchRemoteVersion(
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const body = (await response.json()) as RemoteVersion;
    return typeof body.version === 'string' ? body.version : null;
  } catch {
    return null;
  }
}

export async function checkForUpdate(
  fetchImpl: typeof fetch = fetch,
  current: string = APP_VERSION,
): Promise<boolean> {
  const remote = await fetchRemoteVersion(fetchImpl);
  return remote != null && isNewerVersion(remote, current);
}
