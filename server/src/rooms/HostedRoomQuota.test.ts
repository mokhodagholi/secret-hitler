import { describe, expect, it } from '@rstest/core';
import { BAN_DURATION_MS, HostedRoomQuota } from './HostedRoomQuota';

describe('HostedRoomQuota', () => {
  it('Should allow the first hosted room for an address', () => {
    const quota = new HostedRoomQuota();
    expect(quota.claim('203.0.113.8', 'client:one', 'room-1')).toBeNull();
    expect(quota.isBlocked('203.0.113.8', 'client:one')).toBe(false);
  });

  it('Should drop a second room without banning anyone', () => {
    const quota = new HostedRoomQuota();
    quota.claim('203.0.113.8', 'client:one', 'room-1');
    expect(quota.claim('203.0.113.8', 'client:two', 'room-2')).toEqual({ bans: [] });
    expect(quota.isBlocked('203.0.113.8', 'client:two')).toBe(false);
  });

  it('Should not ban a Bale account that opens a second room', () => {
    const quota = new HostedRoomQuota();
    quota.claim('203.0.113.8', 'bale:9', 'room-1');
    expect(quota.claim('203.0.113.8', 'bale:9', 'room-2')).toEqual({ bans: [] });
    expect(quota.isBlocked('203.0.113.8', 'bale:9')).toBe(false);
    expect(quota.claim('203.0.113.8', 'bale:10', 'room-3')).toBeNull();
  });

  it('Should ban an anonymous address on the third create', () => {
    const quota = new HostedRoomQuota();
    expect(quota.claim('203.0.113.8', 'client:1', 'room-1')).toBeNull();
    expect(quota.claim('203.0.113.8', 'client:2', 'room-2')).toEqual({ bans: [] });
    expect(quota.claim('203.0.113.8', 'client:3', 'room-3')).toEqual({
      bans: [{ kind: 'ip', value: '203.0.113.8' }],
    });
    expect(quota.isBlocked('203.0.113.8', 'client:4')).toBe(true);
    expect(quota.isBlocked('203.0.113.8', 'bale:9')).toBe(false);
  });

  it('Should lift the ban after two hours', () => {
    let now = 1_000;
    const quota = new HostedRoomQuota(() => now);
    quota.claim('203.0.113.8', 'client:1', 'room-1');
    quota.claim('203.0.113.8', 'client:2', 'room-2');
    quota.claim('203.0.113.8', 'client:3', 'room-3');

    now += BAN_DURATION_MS - 1;
    expect(quota.isBlocked('203.0.113.8', 'client:4')).toBe(true);
    expect(quota.expire()).toEqual([]);

    now += 1;
    expect(quota.isBlocked('203.0.113.8', 'client:4')).toBe(false);
    expect(quota.expire()).toEqual([{ kind: 'ip', value: '203.0.113.8' }]);
  });

  it('Should not restore a ban that already expired', () => {
    const now = 10_000;
    const quota = new HostedRoomQuota(() => now);
    quota.restore([{ kind: 'ip', value: '203.0.113.8', bannedAt: now - BAN_DURATION_MS }]);
    expect(quota.isBlocked('203.0.113.8', null)).toBe(false);

    quota.restore([{ kind: 'ip', value: '203.0.113.9', bannedAt: now - 60_000 }]);
    expect(quota.isBlocked('203.0.113.9', null)).toBe(true);
  });

  it('Should let a finished host open another table', () => {
    const quota = new HostedRoomQuota();
    quota.claim('203.0.113.8', 'bale:9', 'room-1');
    quota.forget('room-1');
    expect(quota.claim('203.0.113.8', 'bale:9', 'room-2')).toBeNull();
  });
});
