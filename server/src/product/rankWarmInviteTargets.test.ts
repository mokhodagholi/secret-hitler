import { describe, expect, it } from '@rstest/core';
import type { ProductEvent } from './ProductStore';
import { LOBBY_FILL, invitesForWave } from './lobbyFill';
import { rankWarmInviteTargets } from './rankWarmInviteTargets';

const NOW = new Date('2026-09-17T12:00:00.000Z');

function event(
  name: ProductEvent['name'],
  userKey: string,
  minutesAgo: number,
): ProductEvent {
  return {
    name,
    at: new Date(NOW.getTime() - minutesAgo * 60_000),
    platform: 'bale',
    userKey,
  };
}

describe('rankWarmInviteTargets', () => {
  it('Should prefer recent find_match over seated-only users', () => {
    const ranked = rankWarmInviteTargets(
      [
        event('seated', 'bale:1', 20),
        event('find_match', 'bale:2', 25),
        event('miniapp_auth', 'bale:3', 30),
      ],
      {
        platform: 'bale',
        now: NOW,
        warmWindowMs: LOBBY_FILL.warmWindowMs,
        postGameCooldownMs: LOBBY_FILL.postGameCooldownMs,
        inviteCooldownMs: LOBBY_FILL.inviteCooldownMs,
        excludeUserKeys: new Set(),
        limit: 10,
      },
    );
    expect(ranked[0]).toBe('bale:2');
    expect(ranked).toContain('bale:1');
    expect(ranked).toContain('bale:3');
  });

  it('Should skip users who finished a game inside the cooldown', () => {
    const ranked = rankWarmInviteTargets(
      [event('seated', 'bale:9', 15), event('game_finished', 'bale:9', 10)],
      {
        platform: 'bale',
        now: NOW,
        warmWindowMs: LOBBY_FILL.warmWindowMs,
        postGameCooldownMs: LOBBY_FILL.postGameCooldownMs,
        inviteCooldownMs: LOBBY_FILL.inviteCooldownMs,
        excludeUserKeys: new Set(),
        limit: 10,
      },
    );
    expect(ranked).toEqual([]);
  });

  it('Should skip users already invited inside the invite cooldown', () => {
    const ranked = rankWarmInviteTargets(
      [event('seated', 'bale:9', 20), event('lobby_fill_invite', 'bale:9', 60)],
      {
        platform: 'bale',
        now: NOW,
        warmWindowMs: LOBBY_FILL.warmWindowMs,
        postGameCooldownMs: LOBBY_FILL.postGameCooldownMs,
        inviteCooldownMs: LOBBY_FILL.inviteCooldownMs,
        excludeUserKeys: new Set(),
        limit: 10,
      },
    );
    expect(ranked).toEqual([]);
  });

  it('Should honor excludeUserKeys', () => {
    const ranked = rankWarmInviteTargets([event('seated', 'bale:9', 20)], {
      platform: 'bale',
      now: NOW,
      warmWindowMs: LOBBY_FILL.warmWindowMs,
      postGameCooldownMs: LOBBY_FILL.postGameCooldownMs,
      inviteCooldownMs: LOBBY_FILL.inviteCooldownMs,
      excludeUserKeys: new Set(['bale:9']),
      limit: 10,
    });
    expect(ranked).toEqual([]);
  });

  it('Should ignore activity older than the warm window', () => {
    const ranked = rankWarmInviteTargets([event('seated', 'bale:9', 400)], {
      platform: 'bale',
      now: NOW,
      warmWindowMs: LOBBY_FILL.warmWindowMs,
      postGameCooldownMs: LOBBY_FILL.postGameCooldownMs,
      inviteCooldownMs: LOBBY_FILL.inviteCooldownMs,
      excludeUserKeys: new Set(),
      limit: 10,
    });
    expect(ranked).toEqual([]);
  });

  it('Should include lukewarm activity inside a 6 hour window', () => {
    const ranked = rankWarmInviteTargets([event('seated', 'bale:9', 200)], {
      platform: 'bale',
      now: NOW,
      warmWindowMs: LOBBY_FILL.warmWindowMs,
      postGameCooldownMs: LOBBY_FILL.postGameCooldownMs,
      inviteCooldownMs: LOBBY_FILL.inviteCooldownMs,
      excludeUserKeys: new Set(),
      limit: 10,
    });
    expect(ranked).toEqual(['bale:9']);
  });
});

describe('invitesForWave', () => {
  it('Should invite enough seats to reach five, capped at three', () => {
    expect(invitesForWave(3)).toBe(2);
    expect(invitesForWave(4)).toBe(1);
    expect(invitesForWave(5)).toBe(0);
  });
});
