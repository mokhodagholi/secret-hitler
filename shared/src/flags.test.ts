import { describe, expect, it } from '@rstest/core';
import {
  DEFAULT_FLAGS,
  parseFeatureFlags,
  parseFlagsResponse,
  toFlagsResponse,
} from './flags';

describe('parseFeatureFlags', () => {
  it('Should keep catalog defaults when the source is empty', () => {
    expect(parseFeatureFlags({})).toEqual(DEFAULT_FLAGS);
    expect(parseFeatureFlags({ FEATURE_VOICE: '' }).voice).toBe(false);
    expect(parseFeatureFlags({ FEATURE_VOICE: '   ' }).voice).toBe(false);
    expect(parseFeatureFlags({ FEATURE_PUBLIC_TABLE: '' }).publicTable).toBe(false);
  });

  it('Should turn a flag on only for true or 1', () => {
    expect(parseFeatureFlags({ FEATURE_VOICE: 'true' }).voice).toBe(true);
    expect(parseFeatureFlags({ FEATURE_VOICE: 'TRUE' }).voice).toBe(true);
    expect(parseFeatureFlags({ FEATURE_VOICE: '1' }).voice).toBe(true);
  });

  it('Should treat false and garbage as off', () => {
    expect(parseFeatureFlags({ FEATURE_VOICE: 'false' }).voice).toBe(false);
    expect(parseFeatureFlags({ FEATURE_VOICE: '0' }).voice).toBe(false);
    expect(parseFeatureFlags({ FEATURE_VOICE: 'yes' }).voice).toBe(false);
  });

  it('Should ignore unknown FEATURE_* keys', () => {
    expect(
      parseFeatureFlags({ FEATURE_VOICE: 'true', FEATURE_SECRET: 'true' }),
    ).toEqual({ ...DEFAULT_FLAGS, voice: true });
  });

  it('Should read camelCase flags from SNAKE_CASE env keys', () => {
    expect(parseFeatureFlags({ FEATURE_PUBLIC_TABLE: 'true' }).publicTable).toBe(true);
    expect(parseFeatureFlags({ FEATURE_PUBLICTABLE: 'true' }).publicTable).toBe(
      DEFAULT_FLAGS.publicTable,
    );
    expect(parseFeatureFlags({ FEATURE_LOBBY_KICK: 'true' }).lobbyKick).toBe(true);
    expect(parseFeatureFlags({ FEATURE_LOBBYKICK: 'true' }).lobbyKick).toBe(false);
    expect(parseFeatureFlags({ FEATURE_GAME_KICK: 'true' }).gameKick).toBe(true);
    expect(parseFeatureFlags({ FEATURE_GAMEKICK: 'true' }).gameKick).toBe(false);
    expect(parseFeatureFlags({ FEATURE_ONBOARDING: 'true' }).onboarding).toBe(
      true,
    );
  });
});

describe('toFlagsResponse / parseFlagsResponse', () => {
  it('Should emit only catalog keys', () => {
    expect(toFlagsResponse({ ...DEFAULT_FLAGS, voice: true })).toEqual({
      flags: { ...DEFAULT_FLAGS, voice: true },
    });
  });

  it('Should rebuild known booleans and drop extras', () => {
    expect(parseFlagsResponse({ flags: { voice: true, extra: true } })).toEqual({
      ...DEFAULT_FLAGS,
      voice: true,
    });
    expect(parseFlagsResponse({ flags: {} })).toEqual(DEFAULT_FLAGS);
  });

  it('Should reject a body that is not { flags: object }', () => {
    expect(parseFlagsResponse(null)).toBeNull();
    expect(parseFlagsResponse({ voice: true })).toBeNull();
    expect(parseFlagsResponse({ flags: 'voice' })).toBeNull();
  });
});
