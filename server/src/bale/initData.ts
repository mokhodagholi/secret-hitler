import { createHmac, timingSafeEqual } from 'node:crypto';
import type { MessengerKind } from '@secret-hitler/shared';

/** Max age of mini-app initData before we treat it as stale (24h). */
export const INIT_DATA_MAX_AGE_SEC = 86_400;

/** Telegram/Bale `startapp`: 1–64 of A–Z a–z 0–9 _ -. Ads use `1`. */
const START_PARAM = /^[A-Za-z0-9_-]{1,64}$/;

export function sanitizeStartParam(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !START_PARAM.test(trimmed)) return null;
  return trimmed;
}

/** Read `start_param` from signed initData. Call only after HMAC succeeds. */
export function startParamFromInitData(initData: string): string | null {
  return sanitizeStartParam(new URLSearchParams(initData).get('start_param'));
}

export interface BaleWebAppUser {
  id: number;
  firstName: string;
  username?: string;
}

export interface MessengerIdentity {
  kind: MessengerKind;
  user: BaleWebAppUser;
}

/**
 * HMAC-validate mini-app `WebApp.initData` (url-encoded key=value pairs).
 * Same algorithm on Bale and Telegram.
 * @see https://docs.bale.ai/miniapp
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
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

/** Try each configured bot token; HMAC matches at most one. */
export function identifyInitData(
  initData: string | undefined,
  messengers: Array<{ kind?: MessengerKind; botToken: string }>,
  nowSec?: number,
): MessengerIdentity | null {
  if (!initData) return null;
  for (const messenger of messengers) {
    const user = validateBaleInitData(initData, messenger.botToken, nowSec);
    if (!user) continue;
    return { kind: messenger.kind ?? 'bale', user };
  }
  return null;
}
