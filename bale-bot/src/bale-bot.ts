import type {
  AnswerCallbackQueryParams,
  AnswerPreCheckoutQueryParams,
  BaleFile,
  BanChatMemberParams,
  BotCommand,
  ChatFullInfo,
  ChatId,
  ChatInviteLink,
  ChatMember,
  CopyMessageParams,
  CreateInviteLinkParams,
  DeleteMessageParams,
  DeleteMyCommandsParams,
  EditInviteLinkParams,
  EditMessageCaptionParams,
  EditMessageReplyMarkupParams,
  EditMessageTextParams,
  ForwardMessageParams,
  GetFileParams,
  GetMyCommandsParams,
  GetUpdatesParams,
  InlineKeyboardMarkup,
  InputFile,
  Message,
  MessageId,
  PinChatMessageParams,
  Poll,
  PromoteChatMemberParams,
  RestrictChatMemberParams,
  RevokeInviteLinkParams,
  SendAnimationParams,
  SendAudioParams,
  SendContactParams,
  SendDiceParams,
  SendDocumentParams,
  SendInvoiceParams,
  SendLocationParams,
  SendMediaGroupParams,
  SendMessageParams,
  SendPhotoParams,
  SendPollParams,
  SendStickerParams,
  SendVenueParams,
  SendVideoParams,
  SendVoiceParams,
  SetChatPermissionsParams,
  SetMyCommandsParams,
  SetWebhookParams,
  UnbanChatMemberParams,
  UnpinChatMessageParams,
  Update,
  User,
  WebhookInfo,
} from './api-types.js';
import type { BaleHttpClientOptions } from './http-client.js';
import { BaleHttpClient } from './http-client.js';

export interface BaleBotOptions extends BaleHttpClientOptions {}

/**
 * High-level Bale Bot API client. Methods map 1:1 to `https://tapi.bale.ai/bot{token}/{method}`.
 *
 * The API is Telegram-compatible; methods not supported by Bale will fail at runtime with
 * {@link import('./errors.js').BaleApiError}.
 *
 * @see https://docs.bale.ai/
 *
 * @example
 * ```ts
 * const bot = new BaleBot({ token: process.env.BALE_TOKEN! });
 * const me = await bot.getMe();
 * await bot.sendMessage({ chat_id: msg.chat.id, text: `Hi ${me.first_name}` });
 * ```
 */
export class BaleBot {
  private readonly http: BaleHttpClient;

  constructor(options: BaleBotOptions) {
    this.http = new BaleHttpClient(options);
  }

  /**
   * Invoke any API method by name. Prefer typed methods when available.
   *
   * @param method - Method name, e.g. `"sendMessage"`.
   * @param params - JSON-serializable body; use typed methods for file uploads.
   */
  callMethod<TResult>(method: string, params: object = {}): Promise<TResult> {
    return this.http.request<TResult>(method, params);
  }

  /** @see https://docs.bale.ai/#getupdates */
  getUpdates(params: GetUpdatesParams = {}): Promise<Update[]> {
    return this.http.request<Update[]>('getUpdates', params);
  }

  /** @see https://docs.bale.ai/#setwebhook */
  setWebhook(params: SetWebhookParams): Promise<boolean> {
    return this.http.request<boolean>('setWebhook', params);
  }

  /** @see https://docs.bale.ai/#deletewebhook */
  deleteWebhook(params: { drop_pending_updates?: boolean } = {}): Promise<boolean> {
    return this.http.request<boolean>('deleteWebhook', params);
  }

  /** @see https://docs.bale.ai/#getwebhookinfo */
  getWebhookInfo(): Promise<WebhookInfo> {
    return this.http.request<WebhookInfo>('getWebhookInfo', {});
  }

  /** Returns the bot user; also useful to verify the token. */
  getMe(): Promise<User> {
    return this.http.request<User>('getMe', {});
  }

  /**
   * Telegram-compatible: logs out from the cloud Bot API server. May not exist on all deployments.
   */
  logOut(): Promise<boolean> {
    return this.http.request<boolean>('logOut', {});
  }

  /**
   * Telegram-compatible: closes the bot instance. May not exist on all deployments.
   */
  close(): Promise<boolean> {
    return this.http.request<boolean>('close', {});
  }

  sendMessage(params: SendMessageParams): Promise<Message> {
    return this.http.request<Message>('sendMessage', params);
  }

  forwardMessage(params: ForwardMessageParams): Promise<Message> {
    return this.http.request<Message>('forwardMessage', params);
  }

  copyMessage(params: CopyMessageParams): Promise<MessageId> {
    return this.http.request<MessageId>('copyMessage', params);
  }

  sendPhoto(params: SendPhotoParams): Promise<Message> {
    return this.http.request<Message>('sendPhoto', params);
  }

  sendAudio(params: SendAudioParams): Promise<Message> {
    return this.http.request<Message>('sendAudio', params);
  }

  sendDocument(params: SendDocumentParams): Promise<Message> {
    return this.http.request<Message>('sendDocument', params);
  }

  sendVideo(params: SendVideoParams): Promise<Message> {
    return this.http.request<Message>('sendVideo', params);
  }

  sendAnimation(params: SendAnimationParams): Promise<Message> {
    return this.http.request<Message>('sendAnimation', params);
  }

  sendVoice(params: SendVoiceParams): Promise<Message> {
    return this.http.request<Message>('sendVoice', params);
  }

  sendMediaGroup(params: SendMediaGroupParams): Promise<Message[]> {
    return this.http.request<Message[]>('sendMediaGroup', params);
  }

  sendLocation(params: SendLocationParams): Promise<Message> {
    return this.http.request<Message>('sendLocation', params);
  }

  sendVenue(params: SendVenueParams): Promise<Message> {
    return this.http.request<Message>('sendVenue', params);
  }

  sendContact(params: SendContactParams): Promise<Message> {
    return this.http.request<Message>('sendContact', params);
  }

  sendPoll(params: SendPollParams): Promise<Message> {
    return this.http.request<Message>('sendPoll', params);
  }

  sendDice(params: SendDiceParams): Promise<Message> {
    return this.http.request<Message>('sendDice', params);
  }

  sendSticker(params: SendStickerParams): Promise<Message> {
    return this.http.request<Message>('sendSticker', params);
  }

  /** Stops an active live location message (Telegram-compatible). */
  stopMessageLiveLocation(
    params: {
      chat_id?: ChatId;
      message_id?: number;
      inline_message_id?: string;
      reply_markup?: InlineKeyboardMarkup;
    } = {},
  ): Promise<Message | boolean> {
    return this.http.request<Message | boolean>('stopMessageLiveLocation', params);
  }

  /** Edits location in a live location message (Telegram-compatible). */
  editMessageLiveLocation(params: {
    chat_id?: ChatId;
    message_id?: number;
    inline_message_id?: string;
    latitude: number;
    longitude: number;
    horizontal_accuracy?: number;
    heading?: number;
    proximity_alert_radius?: number;
    live_period?: number;
    reply_markup?: InlineKeyboardMarkup;
  }): Promise<Message | boolean> {
    return this.http.request<Message | boolean>('editMessageLiveLocation', params);
  }

  sendInvoice(params: SendInvoiceParams): Promise<Message> {
    return this.http.request<Message>('sendInvoice', params);
  }

  answerPreCheckoutQuery(params: AnswerPreCheckoutQueryParams): Promise<boolean> {
    return this.http.request<boolean>('answerPreCheckoutQuery', params);
  }

  getFile(params: GetFileParams): Promise<BaleFile> {
    return this.http.request<BaleFile>('getFile', params);
  }

  banChatMember(params: BanChatMemberParams): Promise<boolean> {
    return this.http.request<boolean>('banChatMember', params);
  }

  unbanChatMember(params: UnbanChatMemberParams): Promise<boolean> {
    return this.http.request<boolean>('unbanChatMember', params);
  }

  restrictChatMember(params: RestrictChatMemberParams): Promise<boolean> {
    return this.http.request<boolean>('restrictChatMember', params);
  }

  promoteChatMember(params: PromoteChatMemberParams): Promise<boolean> {
    return this.http.request<boolean>('promoteChatMember', params);
  }

  setChatPermissions(params: SetChatPermissionsParams): Promise<boolean> {
    return this.http.request<boolean>('setChatPermissions', params);
  }

  exportChatInviteLink(chat_id: ChatId): Promise<string> {
    return this.http.request<string>('exportChatInviteLink', { chat_id });
  }

  createChatInviteLink(params: CreateInviteLinkParams): Promise<ChatInviteLink> {
    return this.http.request<ChatInviteLink>('createChatInviteLink', params);
  }

  editChatInviteLink(params: EditInviteLinkParams): Promise<ChatInviteLink> {
    return this.http.request<ChatInviteLink>('editChatInviteLink', params);
  }

  revokeChatInviteLink(params: RevokeInviteLinkParams): Promise<ChatInviteLink> {
    return this.http.request<ChatInviteLink>('revokeChatInviteLink', params);
  }

  setChatPhoto(params: { chat_id: ChatId; photo: InputFile }): Promise<boolean> {
    return this.http.request<boolean>('setChatPhoto', params);
  }

  deleteChatPhoto(chat_id: ChatId): Promise<boolean> {
    return this.http.request<boolean>('deleteChatPhoto', { chat_id });
  }

  setChatTitle(params: { chat_id: ChatId; title: string }): Promise<boolean> {
    return this.http.request<boolean>('setChatTitle', params);
  }

  setChatDescription(params: { chat_id: ChatId; description?: string }): Promise<boolean> {
    return this.http.request<boolean>('setChatDescription', params);
  }

  pinChatMessage(params: PinChatMessageParams): Promise<boolean> {
    return this.http.request<boolean>('pinChatMessage', params);
  }

  unpinChatMessage(params: UnpinChatMessageParams): Promise<boolean> {
    return this.http.request<boolean>('unpinChatMessage', params);
  }

  unpinAllChatMessages(chat_id: ChatId): Promise<boolean> {
    return this.http.request<boolean>('unpinAllChatMessages', { chat_id });
  }

  leaveChat(chat_id: ChatId): Promise<boolean> {
    return this.http.request<boolean>('leaveChat', { chat_id });
  }

  getChat(chat_id: ChatId): Promise<ChatFullInfo> {
    return this.http.request<ChatFullInfo>('getChat', { chat_id });
  }

  getChatAdministrators(chat_id: ChatId): Promise<ChatMember[]> {
    return this.http.request<ChatMember[]>('getChatAdministrators', { chat_id });
  }

  getChatMemberCount(chat_id: ChatId): Promise<number> {
    return this.http.request<number>('getChatMemberCount', { chat_id });
  }

  getChatMember(params: { chat_id: ChatId; user_id: number }): Promise<ChatMember> {
    return this.http.request<ChatMember>('getChatMember', params);
  }

  answerCallbackQuery(params: AnswerCallbackQueryParams): Promise<boolean> {
    return this.http.request<boolean>('answerCallbackQuery', params);
  }

  setMyCommands(params: SetMyCommandsParams): Promise<boolean> {
    return this.http.request<boolean>('setMyCommands', params);
  }

  getMyCommands(params: GetMyCommandsParams = {}): Promise<BotCommand[]> {
    return this.http.request<BotCommand[]>('getMyCommands', params);
  }

  deleteMyCommands(params: DeleteMyCommandsParams = {}): Promise<boolean> {
    return this.http.request<boolean>('deleteMyCommands', params);
  }

  editMessageText(params: EditMessageTextParams): Promise<Message | boolean> {
    return this.http.request<Message | boolean>('editMessageText', params);
  }

  editMessageCaption(params: EditMessageCaptionParams): Promise<Message | boolean> {
    return this.http.request<Message | boolean>('editMessageCaption', params);
  }

  editMessageReplyMarkup(params: EditMessageReplyMarkupParams): Promise<Message | boolean> {
    return this.http.request<Message | boolean>('editMessageReplyMarkup', params);
  }

  deleteMessage(params: DeleteMessageParams): Promise<boolean> {
    return this.http.request<boolean>('deleteMessage', params);
  }

  stopPoll(params: {
    chat_id: ChatId;
    message_id: number;
    reply_markup?: InlineKeyboardMarkup | null;
  }): Promise<Poll> {
    return this.http.request<Poll>('stopPoll', params);
  }

  /**
   * HTTPS URL to download a file using `file_path` from {@link getFile}.
   *
   * @see https://docs.bale.ai/
   */
  getFileDownloadUrl(filePath: string): string {
    return this.http.buildFileDownloadUrl(filePath);
  }
}
