import { createHmac, timingSafeEqual } from 'node:crypto';

/** Max age of mini-app initData before we treat it as stale (24h). */
export const INIT_DATA_MAX_AGE_SEC = 86_400;

export interface BaleWebAppUser {
  id: number;
  firstName: string;
  username?: string;
}

/**
 * HMAC-validate Bale `WebApp.initData` (url-encoded key=value pairs).
 * @see https://docs.bale.ai/miniapp
 */
export function validateBaleInitData(
  initData: string,
  botToken: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): BaleWebAppUser | null {
  if (!initData.trim() || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const digest = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  try {
    const expected = Buffer.from(digest, 'hex');
    const received = Buffer.from(hash, 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return null;
    }
  } catch {
    return null;
  }

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || nowSec - authDate > INIT_DATA_MAX_AGE_SEC) {
    return null;
  }

  const rawUser = params.get('user');
  if (!rawUser) return null;
  try {
    const user = JSON.parse(rawUser) as { id?: unknown; first_name?: unknown; username?: unknown };
    if (typeof user.id !== 'number' || typeof user.first_name !== 'string' || !user.first_name.trim()) {
      return null;
    }
    return {
      id: user.id,
      firstName: user.first_name.trim(),
      username: typeof user.username === 'string' ? user.username : undefined,
    };
  } catch {
    return null;
  }
}
