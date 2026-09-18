import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import {
  INTRO_REASSURE_MS,
  OnboardingIntroScreen,
} from './OnboardingIntroScreen';
import { en } from '../../i18n/locales/en';
import { INTRO_SLIDES } from '../../tutorial/introSlides';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

afterEach(() => {
  rs.restoreAllMocks();
});

describe('OnboardingIntroScreen', () => {
  it('Should show the first piece with Continue and Skip', () => {
    const harness = buildHarness();
    harness.services.tutorial.startIntro({ name: 'You', avatar: 0 });
    harness.services.nav.navigate('onboarding');
    renderWithApp(() => <OnboardingIntroScreen />, harness);

    expect(screen.getByText(en.onboard.piece.rolesTitle)).toBeTruthy();
    expect(screen.getByText(en.onboard.piece.roles)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.onboard.continue })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.onboard.skip })).toBeTruthy();
    const next = screen.getByRole('button', { name: en.onboard.continue });
    const skip = screen.getByRole('button', { name: en.onboard.skip });
    expect(next.compareDocumentPosition(skip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Should keep Back beside Next, with Skip on the right', () => {
    const harness = buildHarness();
    harness.services.tutorial.startIntro({ name: 'You', avatar: 0 });
    harness.services.nav.navigate('onboarding');
    renderWithApp(() => <OnboardingIntroScreen />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    const next = screen.getByRole('button', { name: en.onboard.continue });
    const back = screen.getByRole('button', { name: en.onboard.previous });
    const skip = screen.getByRole('button', { name: en.onboard.skip });
    expect(next.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(back.compareDocumentPosition(skip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Should speak every piece page, including the got-it close', () => {
    const harness = buildHarness();
    const speak = rs.spyOn(harness.services.ravi, 'speakGuide');
    harness.services.tutorial.startIntro({ name: 'You', avatar: 0 });
    harness.services.nav.navigate('onboarding');
    renderWithApp(() => <OnboardingIntroScreen />, harness);

    expect(speak).toHaveBeenCalledWith('onboard.piece.roles');
    speak.mockClear();

    for (let index = 1; index < INTRO_SLIDES.length; index++) {
      speak.mockClear();
      fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
      expect(speak).toHaveBeenCalledTimes(1);
      expect(speak).toHaveBeenCalledWith(INTRO_SLIDES[index]!.bodyKey);
    }
  });

  it('Should play a page tap on the first piece', () => {
    const harness = buildHarness();
    const play = rs.spyOn(harness.services.sound, 'play');
    harness.services.tutorial.startIntro({ name: 'You', avatar: 0 });
    harness.services.nav.navigate('onboarding');
    renderWithApp(() => <OnboardingIntroScreen />, harness);

    expect(play).toHaveBeenCalledWith('onboard-roles');
  });

  it('Should show current and total as separate page numbers', () => {
    const harness = buildHarness();
    harness.services.tutorial.startIntro({ name: 'You', avatar: 0 });
    harness.services.nav.navigate('onboarding');
    renderWithApp(() => <OnboardingIntroScreen />, harness);

    const current = screen.getByText('1');
    const total = screen.getByText(String(INTRO_SLIDES.length));
    const progress = current.parentElement;
    expect(progress).toBe(total.parentElement);
    expect(progress?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      `1 / ${INTRO_SLIDES.length}`,
    );
  });

  it('Should open the look table when they say they got it', () => {
    const harness = buildHarness();
    harness.services.tutorial.startIntro({ name: 'You', avatar: 0 });
    harness.services.nav.navigate('onboarding');
    renderWithApp(() => <OnboardingIntroScreen />, harness);

    for (let index = 0; index < INTRO_SLIDES.length - 1; index++) {
      fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    }
    expect(screen.getByText(en.onboard.piece.checkTitle)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.onboard.piece.checkYes }));

    expect(harness.services.tutorial.introducing()).toBe(false);
    expect(harness.services.tutorial.looking()).toBe(true);
    expect(harness.services.nav.screen()).toBe('game');
  });

  it('Should reassure, then restart from the first piece after a pause', async () => {
    const harness = buildHarness();
    harness.services.tutorial.startIntro({ name: 'You', avatar: 0 });
    harness.services.nav.navigate('onboarding');
    renderWithApp(() => <OnboardingIntroScreen />, harness);

    for (let index = 0; index < INTRO_SLIDES.length - 1; index++) {
      fireEvent.click(screen.getByRole('button', { name: en.onboard.continue }));
    }
    fireEvent.click(screen.getByRole('button', { name: en.onboard.piece.checkNo }));

    expect(screen.getByText(en.onboard.piece.checkReassure)).toBeTruthy();
    expect(harness.services.tutorial.introBeat()).toBe(INTRO_SLIDES.length - 1);
    expect(screen.queryByRole('button', { name: en.onboard.piece.checkYes })).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, INTRO_REASSURE_MS + 50));

    expect(harness.services.tutorial.introBeat()).toBe(0);
    expect(harness.services.tutorial.introducing()).toBe(true);
    expect(screen.getByText(en.onboard.piece.rolesTitle)).toBeTruthy();
    expect(screen.getByText('1').parentElement?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      `1 / ${INTRO_SLIDES.length}`,
    );
  });

  it('Should open the look table when Skip is pressed', () => {
    const harness = buildHarness();
    harness.services.tutorial.startIntro({ name: 'You', avatar: 0 });
    harness.services.nav.navigate('onboarding');
    renderWithApp(() => <OnboardingIntroScreen />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.onboard.skip }));
    expect(harness.services.nav.screen()).toBe('game');
    expect(harness.services.tutorial.introducing()).toBe(false);
    expect(harness.services.tutorial.looking()).toBe(true);
  });

  it('Should ignore Skip while the guide is still speaking', () => {
    const harness = buildHarness();
    rs.spyOn(harness.services.ravi, 'speaking').mockReturnValue(true);
    harness.services.tutorial.startIntro({ name: 'You', avatar: 0 });
    harness.services.nav.navigate('onboarding');
    renderWithApp(() => <OnboardingIntroScreen />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.onboard.skip }));
    expect(harness.services.nav.screen()).toBe('onboarding');
    expect(harness.services.tutorial.looking()).toBe(false);
  });
});
