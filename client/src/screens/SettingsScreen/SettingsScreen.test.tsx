import { describe, expect, it } from '@rstest/core';
import { screen } from '@solidjs/testing-library';
import { SettingsScreen } from './SettingsScreen';
import { en } from '../../i18n/locales/en';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('SettingsScreen', () => {
  it('Should keep player count, timer, theme and language off the page', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.queryByText(en.settings.playerCount)).toBeNull();
    expect(screen.queryByText(en.settings.timer)).toBeNull();
    expect(screen.queryByText(en.settings.theme)).toBeNull();
    expect(screen.queryByText(en.settings.language)).toBeNull();
    expect(screen.queryByText(en.settings.confirmActions)).toBeNull();
  });

  it('Should keep the extra Other links and the header gear off the page', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.queryByLabelText(en.settings.headerLabel)).toBeNull();
    expect(screen.queryByText(en.settings.other)).toBeNull();
    expect(screen.queryByText(en.settings.howToPlay)).toBeNull();
    expect(screen.queryByText(en.settings.about)).toBeNull();
    expect(screen.queryByText(en.settings.resetTutorials)).toBeNull();
    expect(screen.queryByText(en.settings.clearLocalData)).toBeNull();
    expect(screen.queryByText(en.settings.restorePurchases)).toBeNull();
  });

  it('Should show the narrator picker on Daniel', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.getByText(en.settings.raviWho)).toBeTruthy();
    expect(screen.getByText(en.settings.raviNarrator.daniel)).toBeTruthy();
  });
});
