import clientPackage from '../../package.json';

/** How often a live session asks the origin if a new build is sitting there. */
export const UPDATE_POLL_MS = 30 * 60 * 1000;

export const APP_VERSION: string =
  typeof import.meta.env.APP_VERSION === 'string' && import.meta.env.APP_VERSION.length > 0
    ? import.meta.env.APP_VERSION
    : 'dev';

export const APP_PACKAGE_VERSION: string =
  typeof import.meta.env.APP_PACKAGE_VERSION === 'string' &&
  import.meta.env.APP_PACKAGE_VERSION.length > 0
    ? import.meta.env.APP_PACKAGE_VERSION
    : clientPackage.version;

export interface RemoteVersion {
  version: string;
}

/** True when the origin is serving a different build than this page. */
export function isNewerVersion(remote: string, current: string = APP_VERSION): boolean {
  return remote.length > 0 && remote !== current;
}

export const SKIP_WAITING = 'SKIP_WAITING';

/** Bypass the running bundle (and the SW HTML cache) by loading a fresh document. */
export function reloadToLatest(
  assign: (url: string) => void = (href) => location.replace(href),
): void {
  const url = new URL(location.href);
  url.searchParams.set('v', String(Date.now()));
  assign(`${url.pathname}${url.search}${url.hash}`);
}

export interface WaitingWorker {
  postMessage: (message: { type: string }) => void;
}

/** Tell a waiting worker to activate, then load the new document. */
export async function activateWaitingAndReload(
  reload: () => void = () => reloadToLatest(),
  getRegistration: () => Promise<{ waiting?: WaitingWorker | null } | undefined> = () =>
    navigator.serviceWorker?.getRegistration() ?? Promise.resolve(undefined),
): Promise<void> {
  const registration = await getRegistration();
  registration?.waiting?.postMessage({ type: SKIP_WAITING });
  reload();
}

/** The prompt waits until they leave a live table. */
export function isUpdatePromptVisible(available: boolean, screen: string): boolean {
  return available && screen !== 'game';
}

const UPDATE_PREVIEW_ENABLED =
  import.meta.env.DEV || process.env.NODE_ENV === 'test';

/** `?update=1` opens sample notes in dev. Production ignores the flag. */
export function isUpdatePreview(
  search: string = location.search,
  enabled: boolean = UPDATE_PREVIEW_ENABLED,
): boolean {
  return enabled && new URLSearchParams(search).get('update') === '1';
}

/** Drop the preview flag so dismiss does not reload the document. */
export function clearUpdatePreview(
  href: string = location.href,
  replace: (url: string) => void = (next) => history.replaceState(null, '', next),
): void {
  const url = new URL(href);
  if (!url.searchParams.has('update')) return;
  url.searchParams.delete('update');
  const query = url.searchParams.toString();
  replace(`${url.pathname}${query ? `?${query}` : ''}${url.hash}`);
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
