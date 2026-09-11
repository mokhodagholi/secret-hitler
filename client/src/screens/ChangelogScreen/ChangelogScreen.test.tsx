import { describe, expect, it } from '@rstest/core';
import { screen } from '@solidjs/testing-library';
import { ChangelogScreen } from './ChangelogScreen';
import { en } from '../../i18n/locales/en';
import { fa } from '../../i18n/locales/fa';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('ChangelogScreen', () => {
  it('Should show the empty archive in English', () => {
    const harness = buildHarness();
    renderWithApp(() => <ChangelogScreen />, harness);

    expect(screen.getByText(en.changelog.title)).toBeTruthy();
    expect(screen.getByText(en.changelog.empty)).toBeTruthy();
  });

  it('Should show the empty archive when the language cycles to Persian', () => {
    const harness = buildHarness();
    harness.services.settings.set('language', 'fa');
    renderWithApp(() => <ChangelogScreen />, harness);

    expect(screen.getByText(fa.changelog.title)).toBeTruthy();
    expect(screen.getByText(fa.changelog.empty)).toBeTruthy();
  });
});
