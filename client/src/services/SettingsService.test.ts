import { describe, expect, it } from '@rstest/core';
import { SettingsService } from './SettingsService';

describe('SettingsService', () => {
  it('Should hear the table by default', () => {
    const settings = new SettingsService();
    expect(settings.settings.voiceEnabled).toBe(true);
  });

  it('Should persist a changed setting to localStorage', () => {
    const settings = new SettingsService();
    settings.set('music', false);
    expect(settings.settings.music).toBe(false);

    // A fresh instance reads the persisted value back.
    expect(new SettingsService().settings.music).toBe(false);
  });

  it('Should persist a chosen player-card portrait', () => {
    const settings = new SettingsService();
    settings.set('avatar', 3);
    expect(new SettingsService().settings.avatar).toBe(3);
  });

  it('Should mint a stable profile id for server-side card storage', () => {
    const settings = new SettingsService();
    expect(settings.settings.profileId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(new SettingsService().settings.profileId).toBe(settings.settings.profileId);
  });

  it('Should ignore a stored narrator that is not in the catalog', () => {
    localStorage.setItem(
      'sh:settings',
      JSON.stringify({ raviWho: 'dilara', music: false }),
    );
    const settings = new SettingsService();
    expect(settings.settings.raviWho).toBe('daniel');
    expect(settings.settings.music).toBe(false);
  });

  it('Should keep cycling the narrator inside the shipped catalog', () => {
    const settings = new SettingsService();
    settings.cycleRaviWho();
    expect(settings.settings.raviWho).toBe('daniel');
  });

  it('Should fall back to defaults when stored JSON is corrupt', () => {
    localStorage.setItem('sh:settings', '{ not valid json');
    const settings = new SettingsService();
    expect(settings.settings.music).toBe(true);
  });
});
