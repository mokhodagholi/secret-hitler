import type { Accessor } from 'solid-js';
import {
  LANGUAGES,
  type Direction,
  type FormatMessage,
  type Language,
  type LanguageDef,
} from '../i18n';
import { formatStrings, resolveMessage } from '../i18n/utils';

/**
 * Reactive resolution of message ids into finished strings.
 *
 * The current language is not owned here — it is read from `SettingsService`
 * (single source of truth, persisted to localStorage). `formatMessage` reads
 * that language reactively, so every consumer re-renders when it changes.
 *
 * Usage in a component:
 *   const fm = useApp().i18n.formatMessage;
 *   <span>{fm('home.play')}</span>
 *   <span>{fm('settings.players', { count: 7 })}</span>
 */
export class I18nService {
  /** Active language code (reactive). */
  readonly lang: Accessor<Language>;
  /** Reading direction of the active language (reactive). */
  readonly dir: Accessor<Direction>;

  constructor(getLanguage: () => Language) {
    this.lang = () => getLanguage();
    this.dir = () => LANGUAGES[this.lang()].dir;
  }

  /**
   * Resolve a message id to a string, interpolating `{token}` placeholders from
   * `data` and applying the language's digit formatting. Bound as a field so it
   * can be destructured (`const fm = i18n.formatMessage`).
   */
  readonly formatMessage: FormatMessage = (id, data) => {
    const language: LanguageDef = LANGUAGES[this.lang()];
    const template = resolveMessage(language.strings, id) ?? id;
    const interpolated = data ? formatStrings(template, data) : template;
    return language.formatDigits
      ? language.formatDigits(interpolated)
      : interpolated;
  };

  /** All languages, in picker order — for building a language selector. */
  available(): LanguageDef[] {
    return Object.values(LANGUAGES);
  }

  /** The next language in the registry, wrapping around — for cycle pickers. */
  next(current: Language): Language {
    const codes = Object.keys(LANGUAGES) as Language[];
    const i = codes.indexOf(current);
    return codes[(i + 1) % codes.length];
  }
}
