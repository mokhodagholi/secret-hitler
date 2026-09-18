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

  it('Should idle after queued lines finish', async () => {
    const ravi = makeRavi(false);
    void ravi.speak('night.end');
    void ravi.speak('discuss.start');
    await ravi.idle();
    expect(ravi.line()).toBe('Okay. Time to talk.');
    expect(ravi.speaking()).toBe(false);
  });

  it('Should interpolate names into the subtitle', async () => {
    const ravi = makeRavi(false);
    await ravi.speak('president.first', { name: 'Ana' });
    expect(ravi.line()).toBe('Ana is President this round.');
    await ravi.speak('power.investigated', { name: 'Cal' });
    expect(ravi.line()).toBe("The President is checking Cal’s card.");
  });

  it('Should speak a first-person line when the beat is about the viewer', async () => {
    const ravi = makeRavi(false);
    await ravi.speak('president.firstYou');
    expect(ravi.line()).toBe('You are President this round.');
  });

  it('Should subtitle the investigation party for the President', async () => {
    const ravi = makeRavi(false);
    await ravi.speak('power.investigatedLiberal');
    expect(ravi.line()).toBe('Their card is Liberal.');
    await ravi.speak('power.investigatedFascist');
    expect(ravi.line()).toBe('Their card is Fascist.');
  });

  it('Should play the first-person clip when Ravi Voice is on', async () => {
    const play = rs.spyOn(HTMLMediaElement.prototype, 'play');
    const ravi = makeRavi(true);
    await ravi.speak('nominate.namedAsYou', { president: 'Ana' });
    expect(play).toHaveBeenCalled();
    expect(ravi.line()).toBe('Ana chose you as Chancellor.');
  });

  it('Should interpolate kick-vote names into the subtitle', async () => {
    const ravi = makeRavi(false);
    await ravi.speak('kick.asked', { name: 'Ana', target: 'Cal' });
    expect(ravi.line()).toBe('Ana asked to kick Cal.');
    await ravi.speak('kick.askedYou', { target: 'Cal' });
    expect(ravi.line()).toBe('You asked to kick Cal.');
    await ravi.speak('kick.askedOnYou', { name: 'Ana' });
    expect(ravi.line()).toBe('Ana asked to kick you.');
    await ravi.speak('kick.passedYou', { name: 'Cal' });
    expect(ravi.line()).toBe('Enough votes. Cal is out.');
    await ravi.speak('kick.passedOnYou');
    expect(ravi.line()).toBe("Enough votes. Sorry — you're out.");
    await ravi.speak('kick.failedYou');
    expect(ravi.line()).toBe('Not enough votes.');
    await ravi.speak('kick.failedOnYou');
    expect(ravi.line()).toBe("Not enough votes. You're staying.");
  }, 15_000);

  it('Should subtitle an office-holder leaving the table', async () => {
    const ravi = makeRavi(false);
    await ravi.speak('office.presidentLeft', { name: 'Ana' });
    expect(ravi.line()).toBe('Ana was President and left the game.');
    await ravi.speak('office.roundOver');
    expect(ravi.line()).toBe('This round is over.');
    await ravi.speak('player.left', { name: 'Cal' });
    expect(ravi.line()).toBe('Cal left the game.');
  });

  it('Should subtitle a disconnect and a return to the table', async () => {
    const ravi = makeRavi(false);
    await ravi.speak('player.away', { name: 'Cal' });
    expect(ravi.line()).toBe('Cal left the table. They might come back.');
    await ravi.speak('player.back', { name: 'Cal' });
    expect(ravi.line()).toBe('Cal is back.');
    await ravi.speak('player.backYou');
    expect(ravi.line()).toBe('Welcome back.');
  });

  it('Should subtitle the condition discuss-open lines', async () => {
    const ravi = makeRavi(false);
    await ravi.speak('discuss.afterFail');
    expect(ravi.line()).toBe('This time, try to reach a consensus!');
    await ravi.speak('discuss.afterPower');
    expect(ravi.line()).toBe('Okay, enough with the powers. Now we talk.');
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

  it('Should replay the current line when Ravi Voice is turned back on', async () => {
    const play = rs.spyOn(HTMLMediaElement.prototype, 'play');
    const settings = new SettingsService();
    settings.set('language', 'en');
    settings.set('raviVoice', false);
    const ravi = new RaviService(
      settings,
      new I18nService(() => settings.settings.language),
    );
    await ravi.speak('vote.start');
    expect(play).not.toHaveBeenCalled();
    settings.set('raviVoice', true);
    ravi.setVoiceEnabled(true);
    expect(play).toHaveBeenCalled();
    expect(ravi.line()).toBe('Voting has begun.');
  });

  it('Should drop the current line and clip on skip', async () => {
    const ravi = makeRavi(true);
    void ravi.speak('vote.start');
    ravi.skip();
    await ravi.idle();
    expect(ravi.line()).toBeNull();
    expect(ravi.speaking()).toBe(false);
    expect(ravi.lineDurationMs()).toBe(0);
  });
});
