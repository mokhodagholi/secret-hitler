import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { Show } from 'solid-js';
import { SettingsScreen } from './SettingsScreen';
import { PlayerCardsScreen } from '../PlayerCardsScreen/PlayerCardsScreen';
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
  });

  it('Should open the changelog from the display section', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    fireEvent.click(screen.getByText(en.settings.changelog));
    expect(harness.services.nav.screen()).toBe('changelog');
  });

  it('Should open support from the envelope row', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    fireEvent.click(screen.getByText(en.settings.support));
    expect(harness.services.nav.screen()).toBe('support');
  });

  it('Should keep table voice off the page until the flag is on', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.queryByText(en.settings.tableVoice)).toBeNull();
  });

  it('Should show table voice when the flag is on', () => {
    const harness = buildHarness({ flags: { voice: true } });
    renderWithApp(() => <SettingsScreen />, harness);

    expect(screen.getByText(en.settings.tableVoice)).toBeTruthy();
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

  it('Should flip a toggle when the row is pressed, not only the switch', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    expect(harness.services.settings.settings.music).toBe(true);
    fireEvent.click(screen.getByText(en.settings.music));
    expect(harness.services.settings.settings.music).toBe(false);
  });

  it('Should keep the profile name field from inviting browser suggest', () => {
    const harness = buildHarness();
    renderWithApp(() => <SettingsScreen />, harness);

    const field = screen.getByLabelText(en.settings.profileName);
    expect(field.getAttribute('autocomplete')).toBe('off');
    expect(field.getAttribute('autocorrect')).toBe('off');
    expect(field.getAttribute('spellcheck')).toBe('false');
    expect(field.getAttribute('enterkeyhint')).toBe('done');
  });

  it('Should open the player-card picker from the profile section', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('settings');
    renderWithApp(
      () => (
        <Show
          when={harness.services.nav.screen() === 'settings'}
          fallback={<PlayerCardsScreen />}
        >
          <SettingsScreen />
        </Show>
      ),
      harness,
    );

    expect(screen.getByText('Otto')).toBeTruthy();
    fireEvent.click(screen.getByText(en.settings.playerCard));
    expect(harness.services.nav.screen()).toBe('player-cards');
    expect(screen.getByRole('heading', { name: en.playerCards.title })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(harness.services.nav.screen()).toBe('settings');
  });
});
