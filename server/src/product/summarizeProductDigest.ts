import type { ProductEvent, ProductLobby, ProductMatch } from './ProductStore';
import { PRODUCT_DIGEST } from './productDigest';

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
export function formatProductDigest(snapshot: ProductDigestSnapshot): string {
  const deathLine =
    snapshot.deathReasons.length === 0
      ? '—'
      : snapshot.deathReasons.map((row) => `${row.reason} ${row.count}`).join(' · ');

  return [
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
  ].join('\n');
}
