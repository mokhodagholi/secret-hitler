import { describe, expect, it } from '@rstest/core';
import { screen } from '@solidjs/testing-library';
import { ChangelogScreen } from './ChangelogScreen';
import { en } from '../../i18n/locales/en';
import { fa } from '../../i18n/locales/fa';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('ChangelogScreen', () => {
  it('Should show the shipped briefing in English', () => {
    const harness = buildHarness();
    renderWithApp(() => <ChangelogScreen />, harness);

    expect(screen.getByText(en.changelog.title)).toBeTruthy();
    expect(
      screen.getByText('You can talk with the others in the waiting room, before the game starts.'),
    ).toBeTruthy();
  });

  it('Should show the shipped briefing when the language cycles to Persian', () => {
    const harness = buildHarness();
    harness.services.settings.set('language', 'fa');
    renderWithApp(() => <ChangelogScreen />, harness);

    expect(screen.getByText(fa.changelog.title)).toBeTruthy();
    expect(
      screen.getByText('پیش از شروع بازی می‌توانید در اتاق انتظار با بقیه گفتگو کنید.'),
    ).toBeTruthy();
  });
});
