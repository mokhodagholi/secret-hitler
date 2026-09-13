/** Bale's native WebView injects this; miniapp.js does not. */
export function hasBaleNativeBridge(): boolean {
  return typeof window !== 'undefined' && window.BaleWebApp != null;
}

/** Telegram Android / iOS WebView bridges. Absent on Bale, including Bale web. */
export function hasTelegramNativeBridge(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.TelegramWebviewProxy != null) return true;
  return window.webkit?.messageHandlers?.TelegramWebView != null;
}

/**
 * Iframe parent. Bale web has no BaleWebApp; Telegram web has no
 * TelegramWebviewProxy. Both SDKs parse the same tgWebAppData hash, so
 * this is how we tell the two web clients apart before looking at initData.
 */
export function parentMessenger(): 'bale' | 'telegram' | null {
  if (typeof document === 'undefined') return null;
  let hay = document.referrer || '';
  try {
    const origins = location.ancestorOrigins;
    if (origins && origins.length > 0) {
      hay += ` ${Array.from(origins).join(' ')}`;
    }
  } catch {
    // ancestorOrigins is a hint some browsers omit.
  }
  if (/bale\.ai/i.test(hay)) return 'bale';
  if (/telegram\.(org|me)|telesco\.pe/i.test(hay)) return 'telegram';
  return null;
}

/** Bale Mini App API is 1.x; Telegram Mini Apps report 6+. Same hash fills both SDKs. */
export function isBaleApiVersion(version: string | undefined): boolean {
  const major = Number.parseInt(version ?? '', 10);
  return Number.isFinite(major) && major >= 1 && major < 6;
}

/** True inside a messenger WebView — do not touch `history` (Bale web BackButton). */
export function isMessengerWebView(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasBaleNativeBridge() || hasTelegramNativeBridge()) return true;
  const parent = parentMessenger();
  if (parent) return true;
  const bale = window.Bale?.WebApp;
  const telegram = window.Telegram?.WebApp;
  return Boolean(bale?.initData?.trim() || telegram?.initData?.trim());
}
