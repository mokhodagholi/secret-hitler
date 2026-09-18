import type { DigestSocialAccept, ProductEvent, ProductLobby, ProductMatch } from './ProductStore';
import { hourInIran } from './hourInIran';
import { PRODUCT_DIGEST, PRODUCT_GOALS } from './productDigest';
import type { ProductScoreboardRange } from './scheduleProductDigest';

export interface ProductDigestSnapshot {
  from: Date;
  to: Date;
  liveRooms: number;
  miniappUsers: number;
  seatedUsers: number;
  lobbiesOpened: number;
  lobbiesDealt: number;
  lobbiesDiedEmpty: number;
  deathReasons: { reason: string; count: number }[];
  peak1to2: number;
  peak3to4: number;
  peak5plus: number;
  fillInvites: number;
  fillFails: number;
  fillFailBlocked: number;
  fillFailRateLimit: number;
  fillFailOther: number;
  fillSatThatRoom: number;
  matchesStarted: number;
  matchesFinished: number;
  matchesAbandoned: number;
}

export interface DigestInput {
  from: Date;
  to: Date;
  liveRooms: number;
  events: readonly ProductEvent[];
  lobbies: readonly ProductLobby[];
  matches: readonly ProductMatch[];
}

function inRange(at: Date, from: Date, to: Date): boolean {
  const ms = at.getTime();
  return ms >= from.getTime() && ms < to.getTime();
}

/** Aggregate product rows into one support-group digest snapshot. */
export function summarizeProductDigest(input: DigestInput): ProductDigestSnapshot {
  const { from, to, liveRooms } = input;
  const convertMs = PRODUCT_DIGEST.fillConvertWindowMs;

  const miniappUsers = new Set<string>();
  const seatedUsers = new Set<string>();
  const invites: { userKey: string; roomCode: string; at: number }[] = [];
  let fillFails = 0;
  let fillFailBlocked = 0;
  let fillFailRateLimit = 0;
  let fillFailOther = 0;

  for (const event of input.events) {
    if (!inRange(event.at, from, to)) continue;
    if (event.name === 'miniapp_auth' && event.userKey) miniappUsers.add(event.userKey);
    if (event.name === 'seated' && event.userKey) seatedUsers.add(event.userKey);
    if (event.name === 'lobby_fill_invite' && event.userKey && event.roomCode) {
      invites.push({
        userKey: event.userKey,
        roomCode: event.roomCode,
        at: event.at.getTime(),
      });
    }
    if (event.name === 'lobby_fill_fail') {
      fillFails += 1;
      const reason = String(event.payload?.reason ?? 'other');
      if (reason === 'blocked') fillFailBlocked += 1;
      else if (reason === 'rate_limit') fillFailRateLimit += 1;
      else fillFailOther += 1;
    }
  }

  let fillSatThatRoom = 0;
  for (const invite of invites) {
    const until = invite.at + convertMs;
    const sat = input.events.some(
      (event) =>
        event.userKey === invite.userKey &&
        (event.name === 'seated' || event.name === 'room_join') &&
        event.roomCode === invite.roomCode &&
        event.at.getTime() >= invite.at &&
        event.at.getTime() < until,
    );
    if (sat) fillSatThatRoom += 1;
  }

  let lobbiesOpened = 0;
  let lobbiesDealt = 0;
  let lobbiesDiedEmpty = 0;
  let peak1to2 = 0;
  let peak3to4 = 0;
  let peak5plus = 0;
  const deathCounts = new Map<string, number>();

  for (const lobby of input.lobbies) {
    if (inRange(lobby.openedAt, from, to)) {
      lobbiesOpened += 1;
      if (lobby.peakSeats <= 2) peak1to2 += 1;
      else if (lobby.peakSeats <= 4) peak3to4 += 1;
      else peak5plus += 1;
    }
    if (lobby.dealtAt && inRange(lobby.dealtAt, from, to)) lobbiesDealt += 1;
    if (lobby.diedAt && !lobby.dealtAt && inRange(lobby.diedAt, from, to)) {
      lobbiesDiedEmpty += 1;
      const reason = lobby.deathReason ?? 'unknown';
      deathCounts.set(reason, (deathCounts.get(reason) ?? 0) + 1);
    }
  }

  const deathReasons = [...deathCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));

  let matchesStarted = 0;
  let matchesFinished = 0;
  let matchesAbandoned = 0;
  for (const match of input.matches) {
    if (inRange(match.startedAt, from, to)) matchesStarted += 1;
    if (match.endedAt && inRange(match.endedAt, from, to)) {
      if (match.outcome === 'abandoned') matchesAbandoned += 1;
      else if (match.outcome) matchesFinished += 1;
    }
  }

  return {
    from,
    to,
    liveRooms,
    miniappUsers: miniappUsers.size,
    seatedUsers: seatedUsers.size,
    lobbiesOpened,
    lobbiesDealt,
    lobbiesDiedEmpty,
    deathReasons,
    peak1to2,
    peak3to4,
    peak5plus,
    fillInvites: invites.length,
    fillFails,
    fillFailBlocked,
    fillFailRateLimit,
    fillFailOther,
    fillSatThatRoom,
    matchesStarted,
    matchesFinished,
    matchesAbandoned,
  };
}

function iranParts(at: Date): { hour: number; minute: number } {
  const shifted = new Date(at.getTime() + PRODUCT_DIGEST.iranOffsetMs);
  return { hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() };
}

function formatIranClock(at: Date): string {
  const { hour, minute } = iranParts(at);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function fillFailLabel(snapshot: ProductDigestSnapshot): string {
  if (snapshot.fillFails === 0) return '0';
  const bits: string[] = [];
  if (snapshot.fillFailBlocked) bits.push(`blocked ${snapshot.fillFailBlocked}`);
  if (snapshot.fillFailRateLimit) bits.push(`rate_limit ${snapshot.fillFailRateLimit}`);
  if (snapshot.fillFailOther) bits.push(`other ${snapshot.fillFailOther}`);
  return `${snapshot.fillFails}${bits.length ? ` (${bits.join(' · ')})` : ''}`;
}

function satPct(snapshot: ProductDigestSnapshot): string {
  if (snapshot.fillInvites === 0) return '—';
  const pct = Math.round((100 * snapshot.fillSatThatRoom) / snapshot.fillInvites);
  return `${pct}٪`;
}

/** Persian ops digest for the support group (same voice as kick letters). */
export function formatProductDigest(
  snapshot: ProductDigestSnapshot,
  scoreboard?: ProductScoreboardSnapshot,
): string {
  const deathLine =
    snapshot.deathReasons.length === 0
      ? '—'
      : snapshot.deathReasons.map((row) => `${row.reason} ${row.count}`).join(' · ');

  const lines = [
    `📊 ${formatIranClock(snapshot.from)}–${formatIranClock(snapshot.to)} ایران`,
    '',
    'نفرها',
    `  مینی‌اپ: ${snapshot.miniappUsers} · نشستند: ${snapshot.seatedUsers}`,
    `  میز زنده الان: ${snapshot.liveRooms}`,
    '',
    'لابی',
    `  باز ${snapshot.lobbiesOpened} · شروع ${snapshot.lobbiesDealt} · مرده ${snapshot.lobbiesDiedEmpty}`,
    `  دلیل مرگ: ${deathLine}`,
    `  پیک صندلی: ۱–۲→${snapshot.peak1to2} · ۳–۴→${snapshot.peak3to4} · ۵+→${snapshot.peak5plus}`,
    '',
    'پر کردن لابی',
    `  دعوت ${snapshot.fillInvites} · خطا ${fillFailLabel(snapshot)}`,
    `  نشستند سر همان میز: ${snapshot.fillSatThatRoom} (${satPct(snapshot)})`,
    '',
    'بازی',
    `  شروع ${snapshot.matchesStarted} · تمام ${snapshot.matchesFinished} · رها ${snapshot.matchesAbandoned}`,
  ];

  if (scoreboard) {
    lines.push('', formatProductScoreboard(scoreboard));
  }

  return lines.join('\n');
}

export interface ProductScoreboardSnapshot {
  dayFrom: Date;
  dayTo: Date;
  complete: boolean;
  gamesFinished: number;
  seatedUsers: number;
  reached5: number;
  friendAccepts: number;
  tableInviteAccepts: number;
  eveningSitters: number | null;
  d1SitPct: number | null;
  abandonPct: number | null;
  fillSatPct: number | null;
}

export interface ScoreboardInput {
  range: ProductScoreboardRange;
  events: readonly ProductEvent[];
  lobbies: readonly ProductLobby[];
  matches: readonly ProductMatch[];
  friendAccepts: readonly DigestSocialAccept[];
  tableInviteAccepts: readonly DigestSocialAccept[];
}

function uniqueSeated(events: readonly ProductEvent[], from: Date, to: Date): Set<string> {
  const keys = new Set<string>();
  for (const event of events) {
    if (event.name !== 'seated' || !event.userKey) continue;
    if (!inRange(event.at, from, to)) continue;
    keys.add(event.userKey);
  }
  return keys;
}

function countFillSat(
  events: readonly ProductEvent[],
  from: Date,
  to: Date,
): { invites: number; sat: number } {
  const convertMs = PRODUCT_DIGEST.fillConvertWindowMs;
  const invites: { userKey: string; roomCode: string; at: number }[] = [];
  for (const event of events) {
    if (event.name !== 'lobby_fill_invite' || !event.userKey || !event.roomCode) continue;
    if (!inRange(event.at, from, to)) continue;
    invites.push({ userKey: event.userKey, roomCode: event.roomCode, at: event.at.getTime() });
  }
  let sat = 0;
  for (const invite of invites) {
    const until = invite.at + convertMs;
    const hit = events.some(
      (event) =>
        event.userKey === invite.userKey &&
        (event.name === 'seated' || event.name === 'room_join') &&
        event.roomCode === invite.roomCode &&
        event.at.getTime() >= invite.at &&
        event.at.getTime() < until,
    );
    if (hit) sat += 1;
  }
  return { invites: invites.length, sat };
}

function eveningWindowOpen(range: ProductScoreboardRange): boolean {
  if (range.complete) return true;
  const lastMs = range.dayTo.getTime() - 1;
  if (lastMs < range.dayFrom.getTime()) return false;
  return hourInIran(new Date(lastMs)) >= PRODUCT_DIGEST.eveningHourFrom;
}

function pctOrNull(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return (100 * numerator) / denominator;
}

/** Iran-day fight numbers vs {@link PRODUCT_GOALS}. */
export function summarizeProductScoreboard(input: ScoreboardInput): ProductScoreboardSnapshot {
  const { range, events, lobbies, matches } = input;
  const { dayFrom, dayTo, previousFrom, previousTo, complete } = range;

  const seatedToday = uniqueSeated(events, dayFrom, dayTo);
  const seatedYesterday = uniqueSeated(events, previousFrom, previousTo);
  let returned = 0;
  for (const key of seatedYesterday) {
    if (seatedToday.has(key)) returned += 1;
  }

  let gamesFinished = 0;
  let matchesAbandoned = 0;
  for (const match of matches) {
    if (!match.endedAt || !inRange(match.endedAt, dayFrom, dayTo)) continue;
    if (match.outcome === 'abandoned') matchesAbandoned += 1;
    else if (match.outcome) gamesFinished += 1;
  }

  let reached5 = 0;
  for (const lobby of lobbies) {
    if (lobby.reached5At && inRange(lobby.reached5At, dayFrom, dayTo)) reached5 += 1;
  }

  const fill = countFillSat(events, dayFrom, dayTo);

  let eveningSitters: number | null = null;
  if (eveningWindowOpen(range)) {
    const evening = new Set<string>();
    for (const event of events) {
      if (event.name !== 'seated' || !event.userKey) continue;
      if (!inRange(event.at, dayFrom, dayTo)) continue;
      const hour = hourInIran(event.at);
      if (hour >= PRODUCT_DIGEST.eveningHourFrom && hour < PRODUCT_DIGEST.eveningHourTo) {
        evening.add(event.userKey);
      }
    }
    eveningSitters = evening.size;
  }

  let friendAccepts = 0;
  for (const row of input.friendAccepts) {
    if (inRange(row.resolvedAt, dayFrom, dayTo)) friendAccepts += 1;
  }
  let tableInviteAccepts = 0;
  for (const row of input.tableInviteAccepts) {
    if (inRange(row.resolvedAt, dayFrom, dayTo)) tableInviteAccepts += 1;
  }

  return {
    dayFrom,
    dayTo,
    complete,
    gamesFinished,
    seatedUsers: seatedToday.size,
    reached5,
    friendAccepts,
    tableInviteAccepts,
    eveningSitters,
    d1SitPct: pctOrNull(returned, seatedYesterday.size),
    abandonPct: pctOrNull(matchesAbandoned, gamesFinished + matchesAbandoned),
    fillSatPct: pctOrNull(fill.sat, fill.invites),
  };
}

function vsGoal(actual: number, goal: number): string {
  return `${actual} / ${goal}`;
}

function formatPctValue(value: number | null): string {
  if (value == null) return '—';
  return `${Math.round(value)}٪`;
}

/** Scoreboard block appended under the 6h ops digest. */
export function formatProductScoreboard(snapshot: ProductScoreboardSnapshot): string {
  const header = snapshot.complete
    ? '🎯 دیروز ایران'
    : `🎯 امروز ایران تا ${formatIranClock(snapshot.dayTo)}`;
  const evening =
    snapshot.eveningSitters == null
      ? `— / ${PRODUCT_GOALS.eveningSitters}`
      : vsGoal(snapshot.eveningSitters, PRODUCT_GOALS.eveningSitters);
  const d1Label = snapshot.complete ? 'برگشت فردا' : 'برگشت فردا تا الان';

  return [
    header,
    `  بازی تمام: ${vsGoal(snapshot.gamesFinished, PRODUCT_GOALS.gamesFinished)}`,
    `  نشستند: ${vsGoal(snapshot.seatedUsers, PRODUCT_GOALS.seatedUsers)}`,
    `  رسیدن به ۵: ${vsGoal(snapshot.reached5, PRODUCT_GOALS.reached5)}`,
    `  قبول دوست: ${vsGoal(snapshot.friendAccepts, PRODUCT_GOALS.friendAccepts)}`,
    `  قبول دعوت میز: ${vsGoal(snapshot.tableInviteAccepts, PRODUCT_GOALS.tableInviteAccepts)}`,
    `  نشست شب: ${evening}`,
    `  ${d1Label}: ${formatPctValue(snapshot.d1SitPct)} / ${PRODUCT_GOALS.d1SitPct}٪`,
    'نگهبان',
    `  رها: ${formatPctValue(snapshot.abandonPct)} · سقف ${PRODUCT_GOALS.abandonPctMax}٪`,
    `  پر کردن میز: ${formatPctValue(snapshot.fillSatPct)} · کف ${PRODUCT_GOALS.fillSatPctMin}٪`,
  ].join('\n');
}
