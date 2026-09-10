import type { BaleWebApp } from '../bale';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isLocalBaleHost(hostname: string = location.hostname): boolean {
  return LOCAL_HOSTS.has(hostname);
}

/**
 * No-op `window.Bale.WebApp` for localhost. The real miniapp.js payment
 * listener logs "[Bale Sdk]: invoice id is not provided" outside the native
 * client, so we never load it locally.
 */
export function installLocalBaleMock(): void {
  if (typeof window === 'undefined' || !isLocalBaleHost() || window.Bale) return;

  const noop = (): void => {};
  const startParam =
    new URLSearchParams(location.search).get('tgWebAppStartParam') ??
    new URLSearchParams(location.hash.replace(/^#/, '')).get('tgWebAppStartParam') ??
    undefined;

  const WebApp: BaleWebApp = {
    initData: '',
    initDataUnsafe: startParam ? { start_param: startParam } : {},
    ready: noop,
    expand: noop,
    BackButton: {
      show: noop,
      hide: noop,
      onClick: noop,
    },
  };

  window.Bale = { WebApp };
}
