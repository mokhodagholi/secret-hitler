/**
 * Shared domain and request types for the Bale Bot API (Telegram-compatible).
 *
 * @see https://docs.bale.ai/
 */

/** Chat identifier; channel/supergroup IDs may exceed 32-bit signed range. */
export type ChatId = number | string;

/**
 * File payload for `multipart/form-data` requests (photos, documents, etc.).
 * Use a `Blob` (including browser `File`, which subclasses `Blob`) or raw bytes on Node.
 */
export type InputFile =
  | Blob
  | {
      /** Raw bytes of the file. */
      buffer: Uint8Array;
      /** Filename hint included in multipart requests. */
      filename: string;
    };

export type ParseMode = 'HTML' | 'Markdown' | 'MarkdownV2';

export interface ResponseParameters {
  retry_after?: number;
}

export interface User {
  id?: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface Chat {
  id: number;
  type: 'private' | 'group' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface ChatPhoto {
  small_file_id: string;
  small_file_unique_id: string;
  big_file_id: string;
  big_file_unique_id: string;
}

export interface ChatFullInfo extends Chat {
  photo?: ChatPhoto;
  bio?: string;
  description?: string;
  invite_link?: string;
  linked_chat_id?: string;
}

export interface MessageEntity {
  type: string;
  offset: number;
  length: number;
}

export interface PhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface Animation {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumbnail?: PhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface Audio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface Document {
  file_id: string;
  file_unique_id: string;
  thumbnail?: PhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface Video {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface Voice {
  file_id: string;
  file_unique_id: string;
}

export interface Sticker {
  file_id: string;
  file_unique_id: string;
  type?: string;
  width: number;
  height: number;
  is_animated?: boolean;
  is_video?: boolean;
  thumbnail?: PhotoSize;
  file_size?: number;
}

export interface Contact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
}

export interface Location {
  longitude: number;
  latitude: number;
}

export interface Venue {
  location: Location;
  title: string;
  address: string;
  foursquare_id?: string;
  foursquare_type?: string;
}

export interface Invoice {
  title: string;
  description: string;
  total_amount: number;
}

export interface SuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  /** Present depending on provider payload shape. */
  telegram_payment_charge_id?: string;
  provider_payment_charge_id?: string;
}

export interface WebAppData {
  data: string;
}

export interface WebAppInfo {
  url: string;
}

export interface CopyTextButton {
  text: string;
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: WebAppInfo;
  copy_text?: CopyTextButton;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface KeyboardButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
  web_app?: WebAppInfo;
}

export interface ReplyKeyboardMarkup {
  keyboard: (KeyboardButton | string)[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  selective?: boolean;
}

export interface ReplyKeyboardRemove {
  remove_keyboard: true;
  selective?: boolean;
}

export type ReplyMarkup = InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove;

export interface Message {
  message_id: number;
  from?: User;
  date: number;
  chat: Chat;
  sender_chat?: Chat;
  forward_from?: User;
  forward_from_chat?: Chat;
  forward_from_message_id?: number;
  forward_date?: number;
  reply_to_message?: Message;
  edit_date?: number;
  media_group_id?: string;
  text?: string;
  entities?: MessageEntity[];
  animation?: Animation;
  audio?: Audio;
  document?: Document;
  photo?: PhotoSize[];
  sticker?: Sticker;
  video?: Video;
  voice?: Voice;
  caption?: string;
  caption_entities?: MessageEntity[];
  contact?: Contact;
  location?: Location;
  venue?: Venue;
  new_chat_members?: User[];
  left_chat_member?: User;
  invoice?: Invoice;
  successful_payment?: SuccessfulPayment;
  web_app_data?: WebAppData;
  reply_markup?: InlineKeyboardMarkup;
}

export interface MessageId {
  message_id: number;
}

export interface CallbackQuery {
  id: string;
  from: User;
  message?: Message;
  data?: string;
}

export interface PreCheckoutQuery {
  id: string;
  from: User;
  currency: string;
  total_amount: number;
  invoice_payload: string;
}

export interface Update {
  update_id: number;
  message?: Message;
  edited_message?: Message;
  callback_query?: CallbackQuery;
  pre_checkout_query?: PreCheckoutQuery;
}

export interface WebhookInfo {
  url: string;
}

export interface BaleFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export type ChatMember =
  | ChatMemberOwner
  | ChatMemberAdministrator
  | ChatMemberMember
  | ChatMemberRestricted;

export interface ChatMemberOwner {
  status: 'creator';
  user: User;
}

export interface ChatMemberAdministrator {
  status: 'administrator';
  user: User;
  can_delete_messages?: boolean;
  can_manage_video_chats?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_post_stories?: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
}

export interface ChatMemberMember {
  status: 'member';
  user: User;
}

export interface ChatMemberRestricted {
  status: 'restricted';
  user: User;
  is_member?: boolean;
  can_send_messages?: boolean;
  can_send_audios?: boolean;
  can_send_documents?: boolean;
  can_send_photos?: boolean;
  can_send_videos?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
}

export interface ChatInviteLink {
  invite_link: string;
  creator: User;
  creates_join_request?: boolean;
  is_primary?: boolean;
  is_revoked?: boolean;
  name?: string;
  expire_date?: number;
  member_limit?: number;
  pending_join_request_count?: number;
}

/** Poll type for `sendPoll` (Telegram-compatible fields). */
export interface Poll {
  id: string;
  question: string;
  options: { text: string; voter_count: number }[];
  is_closed: boolean;
}

export type InputMedia =
  | InputMediaAnimation
  | InputMediaDocument
  | InputMediaAudio
  | InputMediaPhoto
  | InputMediaVideo;

export interface InputMediaPhoto {
  type: 'photo';
  media: string | InputFile;
  caption?: string;
  parse_mode?: ParseMode;
}

export interface InputMediaVideo {
  type: 'video';
  media: string | InputFile;
  caption?: string;
  parse_mode?: ParseMode;
  width?: number;
  height?: number;
  duration?: number;
  supports_streaming?: boolean;
}

export interface InputMediaAnimation {
  type: 'animation';
  media: string | InputFile;
  caption?: string;
  parse_mode?: ParseMode;
  width?: number;
  height?: number;
  duration?: number;
}

export interface InputMediaAudio {
  type: 'audio';
  media: string | InputFile;
  caption?: string;
  parse_mode?: ParseMode;
  duration?: number;
  performer?: string;
  title?: string;
}

export interface InputMediaDocument {
  type: 'document';
  media: string | InputFile;
  caption?: string;
  parse_mode?: ParseMode;
  disable_content_type_detection?: boolean;
}

export interface BotCommand {
  command: string;
  description: string;
}

export interface BotCommandScopeDefault {
  type: 'default';
}

export interface BotCommandScopeAllPrivateChats {
  type: 'all_private_chats';
}

export interface BotCommandScopeAllGroupChats {
  type: 'all_group_chats';
}

export interface BotCommandScopeAllChatAdministrators {
  type: 'all_chat_administrators';
}

export interface BotCommandScopeChat {
  type: 'chat';
  chat_id: ChatId;
}

export interface BotCommandScopeChatAdministrators {
  type: 'chat_administrators';
  chat_id: ChatId;
}

export interface BotCommandScopeChatMember {
  type: 'chat_member';
  chat_id: ChatId;
  user_id: number;
}

export type BotCommandScope =
  | BotCommandScopeDefault
  | BotCommandScopeAllPrivateChats
  | BotCommandScopeAllGroupChats
  | BotCommandScopeAllChatAdministrators
  | BotCommandScopeChat
  | BotCommandScopeChatAdministrators
  | BotCommandScopeChatMember;

export type BaleApiResult<T> =
  | { ok: true; result: T; description?: string }
  | { ok: false; error_code: number; description?: string; parameters?: ResponseParameters };

/* ——— Common method parameter blocks ——— */

export interface SendOptions {
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  reply_markup?: ReplyMarkup;
}

export interface SendMessageParams extends SendOptions {
  chat_id: ChatId;
  text: string;
  parse_mode?: ParseMode;
  entities?: MessageEntity[];
  link_preview_options?: Record<string, unknown>;
  disable_web_page_preview?: boolean;
}

export interface ForwardMessageParams {
  chat_id: ChatId;
  from_chat_id: ChatId;
  disable_notification?: boolean;
  protect_content?: boolean;
  message_id: number;
}

export interface CopyMessageParams extends SendOptions {
  chat_id: ChatId;
  from_chat_id: ChatId;
  message_id: number;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
}

export interface SendPhotoParams extends SendOptions {
  chat_id: ChatId;
  photo: string | InputFile;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  has_spoiler?: boolean;
}

export interface SendAudioParams extends SendOptions {
  chat_id: ChatId;
  audio: string | InputFile;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  duration?: number;
  performer?: string;
  title?: string;
  file_name?: string;
}

export interface SendDocumentParams extends SendOptions {
  chat_id: ChatId;
  document: string | InputFile;
  thumbnail?: InputFile;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  disable_content_type_detection?: boolean;
}

export interface SendVideoParams extends SendOptions {
  chat_id: ChatId;
  video: string | InputFile;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: InputFile;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  has_spoiler?: boolean;
  supports_streaming?: boolean;
  file_name?: string;
}

export interface SendAnimationParams extends SendOptions {
  chat_id: ChatId;
  animation: string | InputFile;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: InputFile;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  has_spoiler?: boolean;
  file_name?: string;
}

export interface SendVoiceParams extends SendOptions {
  chat_id: ChatId;
  voice: string | InputFile;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  duration?: number;
}

export interface SendMediaGroupParams {
  chat_id: ChatId;
  media: InputMedia[];
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
}

export interface SendLocationParams extends SendOptions {
  chat_id: ChatId;
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

export interface SendVenueParams extends SendOptions {
  chat_id: ChatId;
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
}

export interface SendContactParams extends SendOptions {
  chat_id: ChatId;
  phone_number: string;
  first_name: string;
  last_name?: string;
  vcard?: string;
}

export interface SendPollParams extends SendOptions {
  chat_id: ChatId;
  question: string;
  options: string[];
  is_anonymous?: boolean;
  type?: 'quiz' | 'regular';
  allows_multiple_answers?: boolean;
  correct_option_id?: number;
  explanation?: string;
  open_period?: number;
  close_date?: number;
  is_closed?: boolean;
}

export interface SendDiceParams extends SendOptions {
  chat_id: ChatId;
  emoji?: string;
}

export interface SendStickerParams extends SendOptions {
  chat_id: ChatId;
  sticker: string | InputFile;
  emoji?: string;
}

export interface SendInvoiceParams extends SendOptions {
  chat_id: ChatId;
  title: string;
  description: string;
  payload: string;
  provider_token?: string;
  currency: string;
  prices: LabeledPrice[];
  max_tip_amount?: number;
  suggested_tip_amounts?: number[];
  start_parameter?: string;
  provider_data?: string;
  photo_url?: string;
  photo_size?: number;
  photo_width?: number;
  photo_height?: number;
  need_name?: boolean;
  need_phone_number?: boolean;
  need_email?: boolean;
  need_shipping_address?: boolean;
  send_phone_number_to_provider?: boolean;
  send_email_to_provider?: boolean;
  is_flexible?: boolean;
}

export interface LabeledPrice {
  label: string;
  amount: number;
}

export interface AnswerPreCheckoutQueryParams {
  pre_checkout_query_id: string;
  ok: boolean;
  error_message?: string;
}

export interface GetUpdatesParams {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowed_updates?: string[];
}

export interface SetWebhookParams {
  url: string;
  certificate?: InputFile;
  ip_address?: string;
  max_connections?: number;
  allowed_updates?: string[];
  drop_pending_updates?: boolean;
  secret_token?: string;
}

export interface GetFileParams {
  file_id: string;
}

export interface KickParams {
  chat_id: ChatId;
  user_id: number;
  until_date?: number;
}

export interface BanChatMemberParams extends KickParams {
  revoke_messages?: boolean;
}

export interface UnbanChatMemberParams {
  chat_id: ChatId;
  user_id: number;
  only_if_banned?: boolean;
}

export interface RestrictChatMemberParams {
  chat_id: ChatId;
  user_id: number;
  permissions: ChatPermissions;
  use_independent_chat_permissions?: boolean;
  until_date?: number;
}

export interface ChatPermissions {
  can_send_messages?: boolean;
  can_send_audios?: boolean;
  can_send_documents?: boolean;
  can_send_photos?: boolean;
  can_send_videos?: boolean;
  can_send_polls?: boolean;
  can_send_other_messages?: boolean;
  can_add_web_page_previews?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
}

export interface PromoteChatMemberParams {
  chat_id: ChatId;
  user_id: number;
  is_anonymous?: boolean;
  can_manage_chat?: boolean;
  can_delete_messages?: boolean;
  can_manage_video_chats?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_post_stories?: boolean;
  can_edit_stories?: boolean;
  can_delete_stories?: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
}

export interface SetChatPermissionsParams {
  chat_id: ChatId;
  permissions: ChatPermissions | null;
  use_independent_chat_permissions?: boolean;
}

export interface PinChatMessageParams {
  chat_id: ChatId;
  message_id: number;
  disable_notification?: boolean;
}

export interface UnpinChatMessageParams {
  chat_id: ChatId;
  message_id?: number;
}

export interface CreateInviteLinkParams {
  chat_id: ChatId;
  name?: string;
  expire_date?: number;
  member_limit?: number;
  creates_join_request?: boolean;
}

export interface EditInviteLinkParams extends CreateInviteLinkParams {
  invite_link: string;
}

export interface RevokeInviteLinkParams {
  chat_id: ChatId;
  invite_link: string;
}

export interface EditMessageTextParams {
  chat_id?: ChatId;
  message_id?: number;
  inline_message_id?: string;
  text: string;
  parse_mode?: ParseMode;
  entities?: MessageEntity[];
  link_preview_options?: Record<string, unknown>;
  disable_web_page_preview?: boolean;
  reply_markup?: InlineKeyboardMarkup;
}

export interface EditMessageCaptionParams {
  chat_id?: ChatId;
  message_id?: number;
  inline_message_id?: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  reply_markup?: InlineKeyboardMarkup;
}

export interface EditMessageReplyMarkupParams {
  chat_id?: ChatId;
  message_id?: number;
  inline_message_id?: string;
  reply_markup?: InlineKeyboardMarkup | null;
}

export interface DeleteMessageParams {
  chat_id: ChatId;
  message_id: number;
}

export interface AnswerCallbackQueryParams {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
}

export interface SetMyCommandsParams {
  commands: BotCommand[];
  scope?: BotCommandScope;
  language_code?: string;
}

export interface DeleteMyCommandsParams {
  scope?: BotCommandScope;
  language_code?: string;
}

export interface GetMyCommandsParams {
  scope?: BotCommandScope;
  language_code?: string;
}
