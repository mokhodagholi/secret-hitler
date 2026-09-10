import { describe, expect, it } from '@rstest/core';
import { screen } from '@solidjs/testing-library';
import { RulesScreen } from './RulesScreen';
import { fa } from '../../i18n/locales/fa';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('RulesScreen', () => {
  it('Should name the game راز هیتلر and use question-style section titles in Persian', () => {
    const harness = buildHarness();
    harness.services.settings.set('language', 'fa');
    renderWithApp(() => <RulesScreen />, harness);

    expect(screen.getByText(fa.rules.overview)).toBeTruthy();
    expect(screen.getByText(fa.rules.setup)).toBeTruthy();
    expect(screen.getByText(fa.rules.roundTitle)).toBeTruthy();
    expect(screen.getByText(fa.rules.failTitle)).toBeTruthy();
    expect(screen.getByText(fa.rules.winningTitle)).toBeTruthy();
    expect(screen.getByText(/راز هیتلر یه بازی نقش/)).toBeTruthy();
  });
});
