import { describe, expect, it } from '@rstest/core';
import { MAX_PLAYERS, MIN_PLAYERS } from '@secret-hitler/shared';
import { SettingsService } from './SettingsService';

describe('SettingsService', () => {
  it('Should persist a changed setting to localStorage', () => {
    const settings = new SettingsService();
    settings.set('music', false);
    expect(settings.settings.music).toBe(false);

    // A fresh instance reads the persisted value back.
    expect(new SettingsService().settings.music).toBe(false);
  });

  it('Should cycle the player count and wrap past the maximum', () => {
    const settings = new SettingsService();
    settings.set('playerCount', MAX_PLAYERS);
    settings.cyclePlayerCount();
    expect(settings.settings.playerCount).toBe(MIN_PLAYERS);
  });

  it('Should cycle the narrator between Farid and Dilara', () => {
    const settings = new SettingsService();
    expect(settings.settings.raviWho).toBe('farid');
    settings.cycleRaviWho();
    expect(settings.settings.raviWho).toBe('dilara');
    settings.cycleRaviWho();
    expect(settings.settings.raviWho).toBe('farid');
  });

  it('Should restore defaults when local data is cleared', () => {
    const settings = new SettingsService();
    settings.set('profileName', 'Ana');
    settings.set('music', false);
    settings.clearLocalData();
    expect(settings.settings.profileName).toBe('');
    expect(settings.settings.music).toBe(true);
    expect(localStorage.getItem('sh:settings')).toBeNull();
  });

  it('Should fall back to defaults when stored JSON is corrupt', () => {
    localStorage.setItem('sh:settings', '{ not valid json');
    const settings = new SettingsService();
    expect(settings.settings.playerCount).toBe(7);
  });
});
