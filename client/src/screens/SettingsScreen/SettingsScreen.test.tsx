import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { SettingsScreen } from './SettingsScreen';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('SettingsScreen', () => {
  it('Should cycle the player count when the row is tapped', () => {
    const harness = buildHarness();
    harness.services.settings.set('playerCount', 7);
    renderWithApp(() => <SettingsScreen />, harness);

    fireEvent.click(screen.getByText('Player Count'));
    expect(harness.services.settings.settings.playerCount).toBe(8);
    expect(screen.getByText('8 Players')).toBeTruthy();
  });

  it('Should flip the timer between disabled and enabled', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.getByText('Disabled')).toBeTruthy();
    fireEvent.click(screen.getByText('Timer'));
    expect(harness.services.settings.settings.timerEnabled).toBe(true);
    expect(screen.getByText('Enabled')).toBeTruthy();
  });

  it('Should switch the interface language and re-render in Persian', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    fireEvent.click(screen.getByText('Language'));
    expect(harness.services.settings.settings.language).toBe('fa');
    // The Profile section title is now Persian — proves the tree re-rendered.
    expect(screen.getByText('پروفایل')).toBeTruthy();
  });
});
