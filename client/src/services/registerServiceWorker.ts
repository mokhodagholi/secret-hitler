/** Register the runtime cache worker. Skip in dev so hashed assets stay fresh. */
export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;
  void navigator.serviceWorker.register('/sw.js').catch(() => {});
}
