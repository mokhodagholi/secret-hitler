import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { SettingsScreen } from './SettingsScreen';
import { en } from '../../i18n/locales/en';
import { LANGUAGES } from '../../i18n';
import { APP_PACKAGE_VERSION } from '../../services/update';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('SettingsScreen', () => {
  it('Should keep player count, timer, theme and confirm-actions off the page', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.queryByText(en.settings.playerCount)).toBeNull();
    expect(screen.queryByText(en.settings.timer)).toBeNull();
    expect(screen.queryByText(en.settings.theme)).toBeNull();
    expect(screen.queryByText(en.settings.confirmActions)).toBeNull();
    expect(screen.queryByText(en.settings.restorePurchases)).toBeNull();
  });

  it('Should cycle language on the display row', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    fireEvent.click(screen.getByText(en.settings.language));
    expect(harness.services.settings.settings.language).toBe('fa');
    expect(screen.getByText(LANGUAGES.fa.nativeName)).toBeTruthy();
  });

  it('Should show the package version', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.getByText(APP_PACKAGE_VERSION)).toBeTruthy();
  });

  it('Should show the narrator picker on Daniel', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.getByText(en.settings.raviWho)).toBeTruthy();
    expect(screen.getByText(en.settings.raviNarrator.daniel)).toBeTruthy();
  });
});
