const IRAN_TZ = 'Asia/Tehran';

/** Wall-clock hour in Iran (0–23) when the lobby opened. */
export function hourInIran(at: Date): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: IRAN_TZ,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at).find((part) => part.type === 'hour')?.value;
  const parsed = Number(hour);
  return Number.isFinite(parsed) ? parsed : 0;
}
