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
  | 'common.ok'
  | 'common.cancel'
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
  | 'settings.profile'
  | 'settings.profileName'
  | 'settings.profileNamePlaceholder'
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
  | 'screens.play'
  | 'play.title'
  | 'play.chooseOption'
  | 'play.createRoom'
  | 'play.createRoomDescription'
  | 'play.joinGame'
  | 'play.joinGameDescription'
  | 'createRoom.title'
  | 'createRoom.roomName'
  | 'createRoom.roomNamePlaceholder'
  | 'createRoom.password'
  | 'createRoom.passwordPlaceholder'
  | 'createRoom.yourName'
  | 'createRoom.yourNamePlaceholder'
  | 'createRoom.submit'
  | 'createRoom.creating'
  | 'joinGame.title'
  | 'joinGame.availableRooms'
  | 'joinGame.refresh'
  | 'joinGame.noRooms'
  | 'joinGame.playerCount'
  | 'joinGame.inProgress'
  | 'joinGame.yourName'
  | 'joinGame.password'
  | 'joinGame.submit'
  | 'joinGame.joining'
  | 'waiting.title'
  | 'waiting.roomName'
  | 'waiting.roomCode'
  | 'waiting.shareLink'
  | 'waiting.copy'
  | 'waiting.copied'
  | 'waiting.playerCount'
  | 'waiting.playersSection'
  | 'waiting.host'
  | 'waiting.ready'
  | 'waiting.notReady'
  | 'waiting.startGame'
  | 'waiting.waitingForPlayers'
  | 'waiting.waitingToJoin'
  | 'waiting.needMore'
  | 'waiting.tips'
  | 'waiting.autoStartGuestNote'
  | 'waiting.leaveRoom'
  | 'tip.watch'
  | 'tip.numbers'
  | 'tip.hitler'
  | 'game.roomLabel'
  | 'game.currentTrack'
  | 'game.endTurn'
  | 'game.youArePresident'
  | 'game.president'
  | 'game.chancellor'
  | 'game.yourRole'
  | 'game.chat'
  | 'game.gameLog'
  | 'game.chatPlaceholder'
  | 'game.send'
  | 'game.leaveRoom'
  | 'game.viewRules'
  | 'game.liberal'
  | 'game.fascist'
  | 'game.electionTracker'
  | 'game.drawPile'
  | 'game.discardPile'
  | 'game.nominateHint'
  | 'leaveDialog.message'
  | 'leaveDialog.hostMessage'
  | 'leaveDialog.confirm'
  | 'roomClosed.hostLeft'
  | 'role.liberal'
  | 'role.fascist'
  | 'role.hitler'
  | 'roleDescription.liberal'
  | 'roleDescription.fascist'
  | 'roleDescription.hitler'
  | 'phase.lobby'
  | 'phase.nomination'
  | 'phase.voting'
  | 'phase.presidentLegislative'
  | 'phase.chancellorLegislative'
  | 'phase.specialPower'
  | 'phase.gameOver'
  | 'connection.connected'
  | 'connection.connecting'
  | 'connection.disconnected'
  | 'error.AUTH_FAILED'
  | 'error.ROOM_NOT_FOUND'
  | 'error.ROOM_FULL'
  | 'error.WRONG_PASSWORD'
  | 'error.ALREADY_STARTED'
  | 'error.NOT_HOST'
  | 'error.NOT_ENOUGH_PLAYERS'
  | 'error.INVALID_ACTION'
  | 'error.NETWORK';

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
