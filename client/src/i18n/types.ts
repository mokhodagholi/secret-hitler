/**
 * Every translatable string id, in dot notation.
 *
 * This union is the contract each locale must satisfy. Because `formatMessage`
 * accepts only a `MessageKey`, a mistyped or missing id is a compile error, not
 * a silent runtime blank. A new language is added by writing one catalog that
 * `satisfies LocaleMessages` — the compiler then forces every key to be present.
 */
export type MessageKey =
  | 'logo.secret'
  | 'logo.hitler'
  | 'logo.tagline'
  | 'nav.rules'
  | 'nav.howToPlay'
  | 'nav.settings'
  | 'nav.home'
  | 'home.play'
  | 'common.comingSoon'
  | 'common.goBack'
  | 'rules.title'
  | 'rules.overview'
  | 'rules.overviewBody'
  | 'rules.components'
  | 'rules.componentCards.roleCards'
  | 'rules.componentCards.policyDeck'
  | 'rules.componentCards.policyTracker'
  | 'rules.componentCards.envelope'
  | 'rules.howToPlay'
  | 'rules.steps.deal.title'
  | 'rules.steps.deal.body'
  | 'rules.steps.elect.title'
  | 'rules.steps.elect.body'
  | 'rules.steps.enact.title'
  | 'rules.steps.enact.body'
  | 'rules.steps.agenda.title'
  | 'rules.steps.agenda.body'
  | 'rules.remember'
  | 'rules.rememberBody'
  | 'rules.trustNoOne'
  | 'settings.title'
  | 'settings.headerLabel'
  | 'settings.gameSettings'
  | 'settings.playerCount'
  | 'settings.players'
  | 'settings.showRoles'
  | 'settings.timer'
  | 'settings.enabled'
  | 'settings.disabled'
  | 'settings.confirmActions'
  | 'settings.display'
  | 'settings.theme'
  | 'settings.classicBlue'
  | 'settings.language'
  | 'settings.music'
  | 'settings.soundEffects'
  | 'settings.other'
  | 'settings.howToPlay'
  | 'settings.about'
  | 'settings.resetTutorials'
  | 'settings.clearLocalData'
  | 'settings.restorePurchases'
  | 'screens.howToPlay'
  | 'screens.about'
  | 'screens.play';

/** A complete catalog: every message id mapped to its template string. */
export type LocaleMessages = Record<MessageKey, string>;

/** Interpolation values, substituted into `{token}` placeholders. */
export type MessageValues = Record<string, string | number>;

/** Resolve a message id (with optional interpolation) to a finished string. */
export type FormatMessage = (id: MessageKey, data?: MessageValues) => string;

/** Reading direction implied by a language's script. */
export type Direction = 'ltr' | 'rtl';

/** Metadata + catalog for one supported language. */
export interface LanguageDef {
  /** BCP-47 code, also used as the `<html lang>` value. */
  readonly code: string;
  /** Name shown in the language picker, written in that language. */
  readonly nativeName: string;
  readonly dir: Direction;
  readonly strings: LocaleMessages;
  /**
   * Optional transform applied to finished output — e.g. localizing ASCII
   * digits to Persian numerals. Keeps per-language formatting in the registry
   * so the service stays language-agnostic.
   */
  readonly formatDigits?: (value: string) => string;
}
