import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { I18nService } from './I18nService';
import { RaviService } from './RaviService';
import { SettingsService } from './SettingsService';

afterEach(() => {
  rs.restoreAllMocks();
});

function makeRavi(raviVoice = true): RaviService {
  const settings = new SettingsService();
  settings.set('language', 'en');
  settings.set('raviVoice', raviVoice);
  return new RaviService(settings, new I18nService(() => settings.settings.language));
}

describe('RaviService', () => {
  it('Should put the subtitle in the header even when voice is off', async () => {
    const ravi = makeRavi(false);
    await ravi.speak('vote.start');
    expect(ravi.line()).toBe('Voting has begun.');
    expect(ravi.speaking()).toBe(false);
  });

  it('Should stay silent while Ravi Voice is off', async () => {
    const play = rs.spyOn(HTMLMediaElement.prototype, 'play');
    const ravi = makeRavi(false);
    await ravi.speak('vote.start');
    expect(play).not.toHaveBeenCalled();
  });

  it('Should play a clip while Ravi Voice is on', async () => {
    const play = rs.spyOn(HTMLMediaElement.prototype, 'play');
    const ravi = makeRavi(true);
    await ravi.speak('vote.start');
    expect(play).toHaveBeenCalled();
  });

  it('Should interpolate names into the subtitle', async () => {
    const ravi = makeRavi(false);
    await ravi.speak('president.first', { name: 'Ana' });
    expect(ravi.line()).toBe('Ana is President this round.');
  });

  it('Should speak a first-person line when the beat is about the viewer', async () => {
    const ravi = makeRavi(false);
    await ravi.speak('president.firstYou');
    expect(ravi.line()).toBe('You are President this round.');
  });

  it('Should subtitle the investigation party for the President', async () => {
    const ravi = makeRavi(false);
    await ravi.speak('power.investigatedLiberal');
    expect(ravi.line()).toBe('Liberal.');
    await ravi.speak('power.investigatedFascist');
    expect(ravi.line()).toBe('Fascist.');
  });

  it('Should play the first-person clip when Ravi Voice is on', async () => {
    const play = rs.spyOn(HTMLMediaElement.prototype, 'play');
    const ravi = makeRavi(true);
    await ravi.speak('nominate.namedAsYou', { president: 'Ana' });
    expect(play).toHaveBeenCalled();
    expect(ravi.line()).toBe('Ana chose you as Chancellor.');
  });

  it('Should play queued lines one after another', async () => {
    const play = rs.spyOn(HTMLMediaElement.prototype, 'play');
    const ravi = makeRavi(true);
    await Promise.all([
      ravi.speak('vote.failed'),
      ravi.speak('tracker.advance', { count: 1 }),
    ]);
    expect(play).toHaveBeenCalledTimes(2);
    expect(ravi.line()).toBe('Election tracker 1 of 3.');
  });
});
