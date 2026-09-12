import type { MessengerKind } from '../types/GameState';

/** Default bot nick for Bale invite links. */
export const DEFAULT_BALE_BOT_USERNAME = '@secret_hitler_bot';

/** Default bot nick for Telegram invite links. Override with TELEGRAM_BOT_USERNAME. */
export const DEFAULT_TELEGRAM_BOT_USERNAME = '@secret_hitler_bot';

/** BotFather Mini App short name: `t.me/{bot}/{shortName}?startapp=`. */
export const DEFAULT_TELEGRAM_WEBAPP_SHORT_NAME = 'game';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function hostnameOf(host: string): string {
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end === -1 ? host : host.slice(0, end + 1);
  }
  return host.split(':')[0];
}

/** Loopback, or a LAN IPv4 so a phone on the same Wi-Fi still gets `/join/CODE`. */
function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31)
  );
}

/** Loopback / LAN browser hosts — these invites stay on `/join/CODE`. */
export function isLocalInviteHost(host: string): boolean {
  const hostname = hostnameOf(host);
  return LOCAL_HOSTS.has(hostname) || isPrivateIpv4(hostname);
}

export interface MiniAppStartLinkParams {
  botUsername: string;
  startApp?: string;
  platform?: MessengerKind;
  telegramShortName?: string;
}

/**
 * Opens the mini-app inside the messenger. Chat and production invites use this,
 * never the public website.
 */
export function miniAppStartLink(botUsername: string, startApp?: string): string;
export function miniAppStartLink(params: MiniAppStartLinkParams): string;
export function miniAppStartLink(
  botUsernameOrParams: string | MiniAppStartLinkParams,
  startApp = '',
): string {
  const params: MiniAppStartLinkParams =
    typeof botUsernameOrParams === 'string'
      ? { botUsername: botUsernameOrParams, startApp }
      : botUsernameOrParams;
  const nick = params.botUsername.replace(/^@/, '');
  const payload = params.startApp ?? '';
  if (params.platform === 'telegram') {
    const shortName = (params.telegramShortName || DEFAULT_TELEGRAM_WEBAPP_SHORT_NAME).replace(
      /^\//,
      '',
    );
    return `https://t.me/${nick}/${shortName}?startapp=${payload}`;
  }
  return `https://ble.ir/${nick}?startapp=${payload}`;
}

/** Localhost copies a `/join/CODE` URL so the browser can open it; otherwise this host's mini-app. */
export function roomInviteLink(params: {
  code: string;
  origin: string;
  hostname: string;
  botUsername?: string;
  platform?: MessengerKind;
  telegramShortName?: string;
}): string {
  if (isLocalInviteHost(params.hostname)) {
    return `${params.origin.replace(/\/$/, '')}/join/${params.code}`;
  }
  const platform = params.platform ?? 'bale';
  const botUsername =
    params.botUsername ||
    (platform === 'telegram' ? DEFAULT_TELEGRAM_BOT_USERNAME : DEFAULT_BALE_BOT_USERNAME);
  return miniAppStartLink({
    botUsername,
    startApp: params.code,
    platform,
    telegramShortName: params.telegramShortName,
  });
}
