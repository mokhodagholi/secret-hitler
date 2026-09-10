/** How long splash keeps probing before it admits the line is dead. */
export const ONLINE_WAIT_MS = 5_000;

const PROBE_MS = 1_500;
const RETRY_GAP_MS = 400;

export interface WaitForOnlineOptions {
  timeoutMs?: number;
  probe?: () => Promise<boolean>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/**
 * Keep asking the origin if it is reachable. Returns on the first success,
 * or `false` after `timeoutMs` of failures (default 5 seconds).
 */
export async function waitForOnline(
  options: WaitForOnlineOptions = {},
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? ONLINE_WAIT_MS;
  const probe = options.probe ?? probeServer;
  const sleep =
    options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const deadline = now() + timeoutMs;

  while (true) {
    if (await probe()) return true;
    const left = deadline - now();
    if (left <= 0) return false;
    await sleep(Math.min(RETRY_GAP_MS, left));
  }
}

/** Same-origin ping the table actually needs — the public room list. */
export async function probeServer(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_MS);
    const response = await fetch('/api/rooms', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}
