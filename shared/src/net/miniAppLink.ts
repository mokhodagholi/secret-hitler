/** Default bot nick for Bale invite links. Telegram `t.me` can land here later. */
export const DEFAULT_BALE_BOT_USERNAME = '@secret_hitler_bot';

/**
 * Opens the mini-app inside the messenger. Chat and lobby invites use this,
 * never the public website. Telegram would be `https://t.me/{nick}?startapp=`.
 */
export function miniAppStartLink(botUsername: string, startApp = ''): string {
  const nick = botUsername.replace(/^@/, '');
  return `https://ble.ir/${nick}?startapp=${startApp}`;
}
