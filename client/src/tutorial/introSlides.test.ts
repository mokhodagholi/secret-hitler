import { describe, expect, it } from '@rstest/core';
import { INTRO_SLIDE_COUNT, INTRO_SLIDES, effectForIntroVisual } from './introSlides';
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

  it('Should introduce the empty tracker before the fail marks', () => {
    const marks = INTRO_SLIDES.filter(
      (slide) => slide.visual.kind === 'tracker',
    ).map((slide) => (slide.visual.kind === 'tracker' ? slide.visual.marks : -1));
    expect(marks).toEqual([0, 1, 2, 3]);
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

  it('Should name a lesson sting for each intro piece', () => {
    expect(effectForIntroVisual({ kind: 'welcome' })).toBe('onboard-turn');
    expect(
      effectForIntroVisual({ kind: 'images', layout: 'trio', srcs: [] }),
    ).toBe('onboard-roles');
    expect(
      effectForIntroVisual({ kind: 'images', layout: 'stack', srcs: [] }),
    ).toBe('onboard-boards');
    expect(effectForIntroVisual({ kind: 'government' })).toBe('onboard-offices');
    expect(
      effectForIntroVisual({ kind: 'images', layout: 'row', srcs: [] }),
    ).toBe('onboard-vote');
    expect(effectForIntroVisual({ kind: 'tracker', marks: 1 })).toBeNull();
    expect(effectForIntroVisual({ kind: 'deck', draw: 4, discard: 2 })).toBe(
      'onboard-deck',
    );
    expect(effectForIntroVisual({ kind: 'laws' })).toBe('onboard-laws');
    expect(effectForIntroVisual({ kind: 'check' })).toBe('onboard-turn');
  });
});
