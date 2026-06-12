import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { SoundService } from './SoundService';
import { SettingsService } from './SettingsService';

// Spies live on the shared HTMLMediaElement prototype — reset them per test.
afterEach(() => rs.restoreAllMocks());

describe('SoundService — effects', () => {
  it('Should play an effect while Sound Effects are on', () => {
    const settings = new SettingsService();
    settings.set('soundEffects', true);
    const play = rs.spyOn(HTMLMediaElement.prototype, 'play');

    new SoundService(settings).play('swap-page');

    expect(play).toHaveBeenCalled();
  });

  it('Should stay silent while Sound Effects are off', () => {
    const settings = new SettingsService();
    settings.set('soundEffects', false);
    const play = rs.spyOn(HTMLMediaElement.prototype, 'play');

    new SoundService(settings).play('swap-page');

    expect(play).not.toHaveBeenCalled();
  });
});

describe('SoundService — music toggle', () => {
  it('Should pause the loop when Music is turned off', () => {
    const settings = new SettingsService();
    settings.set('music', true);
    const pause = rs.spyOn(HTMLMediaElement.prototype, 'pause');

    const sound = new SoundService(settings);
    sound.setMusicEnabled(false);

    // Nothing is playing yet, so there is nothing to pause.
    expect(pause).not.toHaveBeenCalled();
  });
});
