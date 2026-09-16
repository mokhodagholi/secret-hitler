import { describe, expect, it } from '@rstest/core';
import { INTRO_SLIDE_COUNT, INTRO_SLIDES } from './introSlides';
import { TutorialService } from './TutorialService';

describe('TutorialService — intro', () => {
  it('Should walk every intro slide then hand off', () => {
    const tutorial = new TutorialService();
    tutorial.startIntro({ name: 'You', avatar: 0 });
    expect(tutorial.introducing()).toBe(true);
    expect(tutorial.introBeat()).toBe(0);
    expect(INTRO_SLIDES.length).toBe(INTRO_SLIDE_COUNT);

    for (let index = 1; index < INTRO_SLIDE_COUNT; index++) {
      expect(tutorial.advanceIntro()).toBe(false);
      expect(tutorial.introBeat()).toBe(index);
    }

    expect(tutorial.advanceIntro()).toBe(true);
    expect(tutorial.introducing()).toBe(false);
  });

  it('Should retreat to the previous intro slide', () => {
    const tutorial = new TutorialService();
    tutorial.startIntro({ name: 'You', avatar: 0 });
    tutorial.advanceIntro();
    expect(tutorial.introBeat()).toBe(1);
    expect(tutorial.retreatIntro()).toBe(true);
    expect(tutorial.introBeat()).toBe(0);
    expect(tutorial.retreatIntro()).toBe(false);
  });

  it('Should restart intro at the first piece', () => {
    const tutorial = new TutorialService();
    tutorial.startIntro({ name: 'You', avatar: 0 });
    while (tutorial.introBeat() < INTRO_SLIDE_COUNT - 1) {
      tutorial.advanceIntro();
    }
    expect(tutorial.introBeat()).toBe(INTRO_SLIDE_COUNT - 1);
    tutorial.restartIntro();
    expect(tutorial.introBeat()).toBe(0);
    expect(tutorial.introducing()).toBe(true);
  });

  it('Should skip intro without marking the look complete', () => {
    const tutorial = new TutorialService();
    tutorial.startIntro({ name: 'You', avatar: 0 });
    tutorial.skipIntro();
    expect(tutorial.introducing()).toBe(false);
    expect(tutorial.declineCount()).toBe(1);
    expect(tutorial.shouldOffer()).toBe(true);
  });
});
