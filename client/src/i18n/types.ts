import { en } from './locales/en';

/** Message shape every locale must provide — inferred from the English catalog. */
export type LocaleMessages = typeof en;

/** Dot-path of every leaf string, e.g. `'logo.secret' | 'settings.players'`. */
export type MessageKey = LeafPaths<LocaleMessages>;

type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : `${K}.${LeafPaths<T[K]>}`;
}[keyof T & string];

/** Interpolation values, substituted into `{token}` placeholders. */
export type MessageValues = Record<string, string | number>;

/** Resolve a message id (with optional interpolation) to a finished string. */
export type FormatMessage = (id: MessageKey, data?: MessageValues) => string;

/** Reading direction implied by a language's script. */
export type Direction = 'ltr' | 'rtl';

/** Metadata + catalog for one supported language. */
export interface LanguageDef {
  readonly code: string;
  readonly nativeName: string;
  readonly dir: Direction;
  readonly strings: LocaleMessages;
  /** Optional output transform, e.g. localizing digits to Persian numerals. */
  readonly formatDigits?: (value: string) => string;
}
