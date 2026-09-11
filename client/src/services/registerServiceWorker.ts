import { SKIP_WAITING } from './update';

/** First visit has no controller yet — take over. Updates wait for the modal. */
export function shouldClaimWaitingWorker(
  hasController: boolean,
  waiting: boolean,
): boolean {
  return waiting && !hasController;
}

/** Register the Workbox worker. Skip in dev so hashed assets stay fresh. */
export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) {
    // `pnpm dev:https` is a secure context, so a leftover production worker
    // would keep serving the last build and a default-off flag catalog.
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) void registration.unregister();
    });
    return;
  }
  void navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      const claim = (worker: ServiceWorker | null | undefined) => {
        if (
          !worker ||
          !shouldClaimWaitingWorker(navigator.serviceWorker.controller != null, true)
        ) {
          return;
        }
        worker.postMessage({ type: SKIP_WAITING });
      };
      claim(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') claim(worker);
        });
      });
    })
    .catch(() => {});
}
