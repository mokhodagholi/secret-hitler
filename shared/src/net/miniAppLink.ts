/** Default bot nick for Bale invite links. Telegram `t.me` can land here later. */
export const DEFAULT_BALE_BOT_USERNAME = '@secret_hitler_bot';

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

/**
 * Opens the mini-app inside the messenger. Chat and production invites use this,
 * never the public website. Telegram would be `https://t.me/{nick}?startapp=`.
 */
export function miniAppStartLink(botUsername: string, startApp = ''): string {
  const nick = botUsername.replace(/^@/, '');
  return `https://ble.ir/${nick}?startapp=${startApp}`;
}

/** Localhost copies a `/join/CODE` URL so the browser can open it; Bale otherwise. */
export function roomInviteLink(params: {
  code: string;
  origin: string;
  hostname: string;
  botUsername?: string;
}): string {
  if (isLocalInviteHost(params.hostname)) {
    return `${params.origin.replace(/\/$/, '')}/join/${params.code}`;
  }
  return miniAppStartLink(params.botUsername || DEFAULT_BALE_BOT_USERNAME, params.code);
}
