export const SHARED_VERSION = '0.0.1';

// Types
export * from './types/GameState';
export * from './types/events';
export {
  DEFAULT_FLAGS,
  FLAG_NAMES,
  parseFeatureFlags,
  parseFlagsResponse,
  toFlagsResponse,
} from './flags';
export type { FeatureFlags, FlagName, FlagsResponse } from './flags';
export { AVATAR_COUNT, normalizeAvatar } from './avatars';
export {
  SOCIAL_IGNORE_COOLDOWN_MS,
  SOCIAL_INVITE_DAILY_LIMIT,
  SOCIAL_REQUEST_DAILY_LIMIT,
  TABLE_INVITE_NOTE_IDS,
  HOME_TABLE_INVITE_NOTE,
  isTableInviteNoteId,
} from './social';
export type { HistoryMatchView, HistoryMineRequest, HistorySeatView } from './matchHistory';
export type {
  SocialAccountActionBody,
  SocialFriendRequestBody,
  SocialInviteRequestBody,
  SocialInviteSendResponse,
  SocialInviteView,
  SocialListRequest,
  SocialListResponse,
  SocialPerson,
  SocialRequestStatus,
  SocialRequestView,
  SocialTieStatus,
  TableInviteNoteId,
} from './social';

// Domain model
export { Room } from './domain/Room';
export type { RoomSnapshot } from './domain/Room';
export { PolicyDeck } from './domain/PolicyDeck';

// Factories
export { PlayerFactory } from './factories/PlayerFactory';
export { RoomFactory } from './factories/RoomFactory';
export type { RoomCreateArgs } from './factories/RoomFactory';

// Rules
export { buildRoleBag } from './rules/roleDistribution';
export { powerForFascistPolicy } from './rules/boardPowers';

// Engine
export { GameEngine } from './engine/GameEngine';
export type { EngineEvents } from './engine/GameEngine';
export { err } from './engine/errors';
export type { EngineError } from './engine/errors';
export type { GamePhase, PhaseHost } from './engine/phases/GamePhase';

// Networking
export { MessageRouter } from './net/MessageRouter';
export type { Tagged, MessageHandler } from './net/MessageRouter';
export { parseClientMessage } from './net/clientMessages';
export {
  DEFAULT_BALE_BOT_USERNAME,
  DEFAULT_TELEGRAM_BOT_USERNAME,
  DEFAULT_TELEGRAM_WEBAPP_SHORT_NAME,
  isLocalInviteHost,
  miniAppStartLink,
  roomInviteLink,
} from './net/miniAppLink';
export type { MiniAppStartLinkParams } from './net/miniAppLink';
export {
  ADMIN_PLAY_SEAT_COUNT,
  parsePlayGameStartApp,
  playGameStartApp,
} from './net/playGameStartApp';

// Utilities
export { TypedEmitter } from './util/TypedEmitter';
export { makeId, makeRoomCode } from './util/ids';
export {
  NOMINATION_PROMPT_MS,
  POWER_PROMPT_MS,
  RAVI_CLIP_MS,
  RAVI_HOLD_PAD_MS,
  VETO_CONSENT_PROMPT_MS,
  VOTE_PROMPT_MS,
  ceremonyDelay,
  raviClipMs,
  raviHoldMs,
} from './ravi/clipMs';
export type { RaviClipId, RaviVoiceId } from './ravi/clipMs';
