import { describe, expect, it } from '@rstest/core';
import { PRODUCT_DIGEST, PRODUCT_GOALS } from './productDigest';
import {
  lastProductDigestAt,
  nextProductDigestAt,
  productDigestWindow,
  productScoreboardRange,
} from './scheduleProductDigest';
import {
  formatProductDigest,
  formatProductScoreboard,
  summarizeProductDigest,
  summarizeProductScoreboard,
} from './summarizeProductDigest';
import type { ProductEvent, ProductLobby, ProductMatch } from './ProductStore';

describe('scheduleProductDigest', () => {
  it('Should schedule the next Iran 6h boundary strictly after now', () => {
    // 2026-09-17 08:30 Iran = 05:00 UTC
    const now = new Date('2026-09-17T05:00:00.000Z');
    const next = nextProductDigestAt(now, PRODUCT_DIGEST.intervalMs);
    // Next boundary 12:00 Iran = 08:30 UTC
    expect(next.toISOString()).toBe('2026-09-17T08:30:00.000Z');
  });

  it('Should roll to the following day after the last slot', () => {
    // 2026-09-17 19:00 Iran = 15:30 UTC → next 00:00 Iran next day
    const now = new Date('2026-09-17T15:30:00.000Z');
    const next = nextProductDigestAt(now, PRODUCT_DIGEST.intervalMs);
    expect(next.toISOString()).toBe('2026-09-17T20:30:00.000Z');
  });

  it('Should build a closed window of the digest interval', () => {
    const to = new Date('2026-09-17T08:30:00.000Z');
    const window = productDigestWindow(to, PRODUCT_DIGEST.intervalMs);
    expect(window.from.toISOString()).toBe('2026-09-17T02:30:00.000Z');
    expect(window.to.toISOString()).toBe('2026-09-17T08:30:00.000Z');
  });

  it('Should return the just-closed boundary at an exact slot', () => {
    // 2026-09-17 00:00 Iran = 2026-09-16 20:30 UTC
    const now = new Date('2026-09-16T20:30:00.000Z');
    expect(lastProductDigestAt(now, PRODUCT_DIGEST.intervalMs).toISOString()).toBe(
      '2026-09-16T20:30:00.000Z',
    );
  });
});

describe('summarizeProductDigest', () => {
  const from = new Date('2026-09-17T06:00:00.000Z');
  const to = new Date('2026-09-17T12:00:00.000Z');

  it('Should count unique people, lobby leak, fill conversion, and matches', () => {
    const events: ProductEvent[] = [
      {
        name: 'miniapp_auth',
        at: new Date('2026-09-17T07:00:00.000Z'),
        userKey: 'bale:1',
        platform: 'bale',
      },
      {
        name: 'miniapp_auth',
        at: new Date('2026-09-17T07:10:00.000Z'),
        userKey: 'bale:1',
        platform: 'bale',
      },
      {
        name: 'seated',
        at: new Date('2026-09-17T07:20:00.000Z'),
        userKey: 'bale:2',
        platform: 'bale',
        roomCode: 'ABCD',
      },
      {
        name: 'lobby_fill_invite',
        at: new Date('2026-09-17T08:00:00.000Z'),
        userKey: 'bale:3',
        platform: 'bale',
        roomCode: 'WAIT',
      },
      {
        name: 'seated',
        at: new Date('2026-09-17T08:05:00.000Z'),
        userKey: 'bale:3',
        platform: 'bale',
        roomCode: 'WAIT',
      },
      {
        name: 'lobby_fill_fail',
        at: new Date('2026-09-17T08:30:00.000Z'),
        userKey: 'bale:9',
        platform: 'bale',
        payload: { reason: 'blocked' },
      },
    ];

    const lobbies: ProductLobby[] = [
      {
        roomCode: 'A',
        source: 'hosted',
        openedAt: new Date('2026-09-17T07:00:00.000Z'),
        hourIran: 10,
        peakSeats: 2,
        reached5At: null,
        dealtAt: null,
        diedAt: new Date('2026-09-17T07:40:00.000Z'),
        deathReason: 'host_left',
        afkKicks: 0,
      },
      {
        roomCode: 'B',
        source: 'public',
        openedAt: new Date('2026-09-17T08:00:00.000Z'),
        hourIran: 11,
        peakSeats: 5,
        reached5At: new Date('2026-09-17T08:10:00.000Z'),
        dealtAt: new Date('2026-09-17T08:15:00.000Z'),
        diedAt: null,
        deathReason: null,
        afkKicks: 0,
      },
    ];

    const matches: ProductMatch[] = [
      {
        roomCode: 'B',
        startedAt: new Date('2026-09-17T08:15:00.000Z'),
        endedAt: new Date('2026-09-17T09:00:00.000Z'),
        outcome: 'liberal_policy',
        disconnects: 0,
        kickVotes: 0,
        afkKicks: 0,
      },
      {
        roomCode: 'C',
        startedAt: new Date('2026-09-17T09:00:00.000Z'),
        endedAt: new Date('2026-09-17T09:20:00.000Z'),
        outcome: 'abandoned',
        disconnects: 2,
        kickVotes: 0,
        afkKicks: 0,
      },
    ];

    const snapshot = summarizeProductDigest({
      from,
      to,
      liveRooms: 2,
      events,
      lobbies,
      matches,
    });

    expect(snapshot.miniappUsers).toBe(1);
    expect(snapshot.seatedUsers).toBe(2);
    expect(snapshot.lobbiesOpened).toBe(2);
    expect(snapshot.lobbiesDealt).toBe(1);
    expect(snapshot.lobbiesDiedEmpty).toBe(1);
    expect(snapshot.deathReasons).toEqual([{ reason: 'host_left', count: 1 }]);
    expect(snapshot.peak1to2).toBe(1);
    expect(snapshot.peak5plus).toBe(1);
    expect(snapshot.fillInvites).toBe(1);
    expect(snapshot.fillSatThatRoom).toBe(1);
    expect(snapshot.fillFails).toBe(1);
    expect(snapshot.fillFailBlocked).toBe(1);
    expect(snapshot.matchesStarted).toBe(2);
    expect(snapshot.matchesFinished).toBe(1);
    expect(snapshot.matchesAbandoned).toBe(1);

    const text = formatProductDigest(snapshot);
    expect(text).toContain('مینی‌اپ: 1');
    expect(text).toContain('دعوت 1');
    expect(text).toContain('blocked 1');
    expect(text).toContain('ایران');
  });
});

describe('productScoreboardRange', () => {
  it('Should post a complete yesterday board at Iran midnight', () => {
    // 2026-09-18 00:00 Iran
    const range = productScoreboardRange(new Date('2026-09-17T20:30:00.000Z'));
    expect(range.complete).toBe(true);
    expect(range.dayFrom.toISOString()).toBe('2026-09-16T20:30:00.000Z');
    expect(range.dayTo.toISOString()).toBe('2026-09-17T20:30:00.000Z');
    expect(range.previousFrom.toISOString()).toBe('2026-09-15T20:30:00.000Z');
    expect(range.lookbackFrom).toEqual(range.previousFrom);
  });

  it('Should post today-so-far at a midday boundary', () => {
    // 2026-09-17 12:00 Iran
    const range = productScoreboardRange(new Date('2026-09-17T08:30:00.000Z'));
    expect(range.complete).toBe(false);
    expect(range.dayFrom.toISOString()).toBe('2026-09-16T20:30:00.000Z');
    expect(range.dayTo.toISOString()).toBe('2026-09-17T08:30:00.000Z');
  });
});

describe('summarizeProductScoreboard', () => {
  it('Should count Iran-day fights, D1 return, and hide evening before 18', () => {
    const complete = productScoreboardRange(new Date('2026-09-17T20:30:00.000Z'));
    const events: ProductEvent[] = [
      {
        name: 'seated',
        at: new Date('2026-09-16T11:30:00.000Z'),
        userKey: 'bale:old',
        platform: 'bale',
        roomCode: 'YEST',
      },
      {
        name: 'seated',
        at: new Date('2026-09-17T06:30:00.000Z'),
        userKey: 'bale:old',
        platform: 'bale',
        roomCode: 'TODAY',
      },
      {
        name: 'seated',
        at: new Date('2026-09-17T15:30:00.000Z'),
        userKey: 'bale:night',
        platform: 'bale',
        roomCode: 'NITE',
      },
      {
        name: 'lobby_fill_invite',
        at: new Date('2026-09-17T07:00:00.000Z'),
        userKey: 'bale:fill',
        platform: 'bale',
        roomCode: 'WAIT',
      },
      {
        name: 'seated',
        at: new Date('2026-09-17T07:05:00.000Z'),
        userKey: 'bale:fill',
        platform: 'bale',
        roomCode: 'WAIT',
      },
    ];
    const lobbies: ProductLobby[] = [
      {
        roomCode: 'FIVE',
        source: 'hosted',
        openedAt: new Date('2026-09-17T07:00:00.000Z'),
        hourIran: 10,
        peakSeats: 5,
        reached5At: new Date('2026-09-17T07:10:00.000Z'),
        dealtAt: new Date('2026-09-17T07:15:00.000Z'),
        diedAt: null,
        deathReason: null,
        afkKicks: 0,
      },
    ];
    const matches: ProductMatch[] = [
      {
        roomCode: 'FIVE',
        startedAt: new Date('2026-09-17T07:15:00.000Z'),
        endedAt: new Date('2026-09-17T08:00:00.000Z'),
        outcome: 'liberal_policy',
        disconnects: 0,
        kickVotes: 0,
        afkKicks: 0,
      },
      {
        roomCode: 'RIP',
        startedAt: new Date('2026-09-17T09:00:00.000Z'),
        endedAt: new Date('2026-09-17T09:10:00.000Z'),
        outcome: 'abandoned',
        disconnects: 1,
        kickVotes: 0,
        afkKicks: 0,
      },
    ];

    const board = summarizeProductScoreboard({
      range: complete,
      events,
      lobbies,
      matches,
      friendAccepts: [{ resolvedAt: new Date('2026-09-17T10:00:00.000Z') }],
      tableInviteAccepts: [
        { resolvedAt: new Date('2026-09-17T11:00:00.000Z') },
        { resolvedAt: new Date('2026-09-16T10:00:00.000Z') },
      ],
    });

    expect(board.complete).toBe(true);
    expect(board.seatedUsers).toBe(3);
    expect(board.d1SitPct).toBe(100);
    expect(board.eveningSitters).toBe(1);
    expect(board.reached5).toBe(1);
    expect(board.gamesFinished).toBe(1);
    expect(board.abandonPct).toBe(50);
    expect(board.fillSatPct).toBe(100);
    expect(board.friendAccepts).toBe(1);
    expect(board.tableInviteAccepts).toBe(1);

    const text = formatProductScoreboard(board);
    expect(text).toContain('🎯 دیروز ایران');
    expect(text).toContain(`بازی تمام: 1 / ${PRODUCT_GOALS.gamesFinished}`);
    expect(text).toContain('برگشت فردا: 100٪');

    const midday = summarizeProductScoreboard({
      range: productScoreboardRange(new Date('2026-09-17T08:30:00.000Z')),
      events,
      lobbies,
      matches,
      friendAccepts: [],
      tableInviteAccepts: [],
    });
    expect(midday.complete).toBe(false);
    expect(midday.eveningSitters).toBeNull();
    expect(formatProductScoreboard(midday)).toContain('امروز ایران تا 12:00');
    expect(formatProductScoreboard(midday)).toContain('نشست شب: —');
  });
});
