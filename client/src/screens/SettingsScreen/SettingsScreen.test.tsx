import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { SettingsScreen } from './SettingsScreen';
import { en } from '../../i18n/locales/en';
import { APP_PACKAGE_VERSION } from '../../services/update';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('SettingsScreen', () => {
  it('Should keep player count, timer, theme, language and confirm-actions off the page', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.queryByText(en.settings.playerCount)).toBeNull();
    expect(screen.queryByText(en.settings.timer)).toBeNull();
    expect(screen.queryByText(en.settings.theme)).toBeNull();
    expect(screen.queryByText(en.settings.language)).toBeNull();
    expect(screen.queryByText(en.settings.confirmActions)).toBeNull();
    expect(screen.queryByText(en.settings.restorePurchases)).toBeNull();
  });

  it('Should open the changelog from the display section', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    fireEvent.click(screen.getByText(en.settings.changelog));
    expect(harness.services.nav.screen()).toBe('changelog');
  });

  it('Should show the package version on the changelog row', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.getByText(`Version ${APP_PACKAGE_VERSION}`)).toBeTruthy();
  });

  it('Should show the narrator name without a cycle arrow when only one voice ships', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.getByText(en.settings.raviWho)).toBeTruthy();
    expect(screen.getByText(en.settings.raviNarrator.daniel)).toBeTruthy();
    expect(screen.getByText(en.settings.raviWho).closest('[role="button"]')).toBeNull();
  });
});
