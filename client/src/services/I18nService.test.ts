import { describe, expect, it } from '@rstest/core';
import { createSignal } from 'solid-js';
import type { Language } from '../i18n';
import { I18nService } from './I18nService';

describe('I18nService', () => {
  it('Should resolve a message id to its English string', () => {
    const i18n = new I18nService(() => 'en');
    expect(i18n.formatMessage('home.play')).toBe('Play');
  });

  it('Should interpolate placeholder values', () => {
    const i18n = new I18nService(() => 'en');
    expect(i18n.formatMessage('settings.players', { count: 7 })).toBe('7 Players');
  });

  it('Should localize digits to Persian numerals', () => {
    const i18n = new I18nService(() => 'fa');
    expect(i18n.formatMessage('settings.players', { count: 7 })).toContain('۷');
  });

  it('Should react when the active language changes', () => {
    const [language, setLanguage] = createSignal<Language>('en');
    const i18n = new I18nService(language);
    expect(i18n.formatMessage('home.play')).toBe('Play');
    setLanguage('fa');
    expect(i18n.formatMessage('home.play')).toBe('بازی');
    expect(i18n.dir()).toBe('rtl');
  });

  it('Should cycle to the next language and wrap around', () => {
    const i18n = new I18nService(() => 'fa');
    const next = i18n.next('fa');
    expect(next).not.toBe('fa');
    expect(i18n.next(next)).toBe('fa');
  });
});
