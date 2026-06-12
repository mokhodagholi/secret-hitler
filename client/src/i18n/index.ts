import type { LanguageDef } from './types';
import { faNum } from './utils';
import { en } from './locales/en';
import { fa } from './locales/fa';

/**
 * Registry of every supported language.
 *
 * To add a language: write `locales/<code>.ts` (a `satisfies LocaleMessages`
 * catalog), then add one entry here. Nothing else in the app needs to change —
 * the picker, persistence, `<html>` direction, and number formatting all read
 * from this map.
 */
export const LANGUAGES = {
  fa: { code: 'fa', nativeName: 'فارسی', dir: 'rtl', strings: fa, formatDigits: faNum },
  en: { code: 'en', nativeName: 'English', dir: 'ltr', strings: en },
} satisfies Record<string, LanguageDef>;

/** A valid language code, e.g. `'fa' | 'en'`. */
export type Language = keyof typeof LANGUAGES;

/** Language the app starts in before a user has chosen one. */
export const DEFAULT_LANGUAGE: Language = 'fa';

export type {
  MessageKey,
  MessageValues,
  FormatMessage,
  LocaleMessages,
  LanguageDef,
  Direction,
} from './types';
