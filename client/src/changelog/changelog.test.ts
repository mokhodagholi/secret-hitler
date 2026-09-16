import { describe, expect, it } from '@rstest/core';
import {
  acknowledgedVersion,
  bumpVersion,
  compareVersions,
  fetchRemoteChangelog,
  parseChangelog,
  readSeenVersion,
  releasesSince,
  rememberCurrentIfUnseen,
  writeSeenVersion,
} from './changelog';
import { CHANGELOG_RELEASES } from './releases';
import { APP_PACKAGE_VERSION } from '../services/update';

describe('bumpVersion', () => {
  it('Should roll major, minor, and patch independently', () => {
    expect(bumpVersion('1.4.2', 'major')).toBe('2.0.0');
    expect(bumpVersion('1.4.2', 'minor')).toBe('1.5.0');
    expect(bumpVersion('1.4.2', 'patch')).toBe('1.4.3');
  });
});

describe('compareVersions', () => {
  it('Should order semver triples', () => {
    expect(compareVersions('0.2.0', '0.1.0')).toBe(1);
    expect(compareVersions('0.1.0', '0.1.0')).toBe(0);
    expect(compareVersions('0.1.0', '0.2.0')).toBe(-1);
  });
});

describe('releasesSince', () => {
  it('Should keep only versions newer than the last seen one', () => {
    const releases = parseChangelog({
      releases: [
        { version: '0.2.0', bump: 'minor', date: '2026-09-20', changes: [{ kind: 'feat', fa: 'دو', en: 'two' }] },
        { version: '0.1.0', bump: 'minor', date: '2026-09-11', changes: [{ kind: 'feat', fa: 'یک', en: 'one' }] },
      ],
    });
    expect(releasesSince(releases, '0.1.0').map((release) => release.version)).toEqual(['0.2.0']);
    expect(releasesSince(releases, '0.2.0')).toEqual([]);
  });
});

describe('acknowledgedVersion', () => {
  it('Should prefer the archive when it is ahead of the running package', () => {
    const releases = parseChangelog({
      releases: [
        { version: '0.6.0', bump: 'minor', date: '2026-09-11', changes: [{ kind: 'feat', fa: 'شش', en: 'six' }] },
      ],
    });
    expect(acknowledgedVersion('0.5.0', releases)).toBe('0.6.0');
    expect(acknowledgedVersion('0.6.0', releases)).toBe('0.6.0');
    expect(acknowledgedVersion('0.7.0', releases)).toBe('0.7.0');
    expect(acknowledgedVersion('0.5.0', [])).toBe('0.5.0');
  });
});

describe('parseChangelog', () => {
  it('Should drop malformed releases instead of throwing', () => {
    expect(parseChangelog(null)).toEqual([]);
    expect(parseChangelog({ releases: [{ version: '1.0.0' }] })).toEqual([]);
  });

  it('Should keep the shipped archive version in lockstep with the client package', () => {
    expect(CHANGELOG_RELEASES[0]?.version).toBe(APP_PACKAGE_VERSION);
    expect(APP_PACKAGE_VERSION).toBe('0.5.0');
  });
});

describe('seen version', () => {
  it('Should remember the running version on a first visit', () => {
    expect(readSeenVersion()).toBeNull();
    rememberCurrentIfUnseen('0.1.0');
    expect(readSeenVersion()).toBe('0.1.0');
    rememberCurrentIfUnseen('0.2.0');
    expect(readSeenVersion()).toBe('0.1.0');
  });

  it('Should overwrite when the player dismisses a later release', () => {
    writeSeenVersion('0.1.0');
    writeSeenVersion('0.2.0');
    expect(readSeenVersion()).toBe('0.2.0');
  });
});

describe('fetchRemoteChangelog', () => {
  it('Should parse a remote file and stay empty on a failed probe', async () => {
    const ok = (async () =>
      new Response(
        JSON.stringify({
          releases: [
            {
              version: '0.2.0',
              bump: 'patch',
              date: '2026-09-12',
              changes: [{ kind: 'fix', fa: 'درست شد', en: 'Fixed it.' }],
            },
          ],
        }),
        { status: 200 },
      )) as unknown as typeof fetch;
    const notes = await fetchRemoteChangelog(ok);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.changes[0]?.en).toBe('Fixed it.');

    const fail = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await fetchRemoteChangelog(fail)).toEqual([]);
  });
});
