import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
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

  it('Should ask before clearing local data', () => {
    const harness = buildHarness();
    harness.services.settings.set('profileName', 'Ana');
    renderWithApp(() => <SettingsScreen />, harness);

    fireEvent.click(screen.getByText(en.settings.clearLocalData));
    expect(screen.getByText(en.settings.clearLocalDataMessage)).toBeTruthy();
    const confirm = screen
      .getAllByRole('button', { name: en.settings.clearLocalData })
      .at(-1);
    fireEvent.click(confirm!);
    expect(harness.services.settings.settings.profileName).toBe('');
  });
});
