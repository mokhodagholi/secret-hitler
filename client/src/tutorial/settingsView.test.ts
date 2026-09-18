import { describe, expect, it } from '@rstest/core';
import {
  SETTINGS_BEATS,
  SETTINGS_TARGET,
  settingsBeatAt,
  settingsBeats,
  settingsShowsPage,
} from './settingsView';

describe('settingsView — home settings tour', () => {
  it('Should ring the gear first, then walk every Settings row', () => {
    expect(settingsBeatAt(0).wait).toBe('open');
    expect(settingsBeatAt(0).target).toBe(SETTINGS_TARGET.gear);
    expect(settingsShowsPage(settingsBeatAt(0))).toBe(false);
    expect(settingsShowsPage(settingsBeatAt(1))).toBe(true);
    expect(settingsBeatAt(1).headline).toBe('onboard.settings.name');
    expect(SETTINGS_BEATS.some((beat) => beat.target === SETTINGS_TARGET.table)).toBe(
      true,
    );
    const quiet = settingsBeats(false);
    expect(quiet.some((beat) => beat.target === SETTINGS_TARGET.table)).toBe(false);
    const spoken = settingsBeats(true);
    expect(spoken.some((beat) => beat.target === SETTINGS_TARGET.table)).toBe(true);
    expect(spoken.at(-1)?.lifted).toBe(true);
    expect(spoken.at(-1)?.headline).toBe('onboard.settings.done');
  });
});
