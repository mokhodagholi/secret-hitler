/** Ready-made table-invite lines. The client never sends free text. */
export const TABLE_INVITE_NOTE_IDS = [
  'emptySeat',
  'anotherHand',
  'roomOpen',
  'savedSeat',
] as const;

export type TableInviteNoteId = (typeof TABLE_INVITE_NOTE_IDS)[number];

export const SOCIAL_INVITE_DAILY_LIMIT = 10;
export const SOCIAL_REQUEST_DAILY_LIMIT = 10;
export const SOCIAL_IGNORE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Line shown when inviting a friend from the waiting-room list. */
export const HOME_TABLE_INVITE_NOTE: TableInviteNoteId = 'emptySeat';

export function isTableInviteNoteId(value: unknown): value is TableInviteNoteId {
  return (
    typeof value === 'string' &&
    (TABLE_INVITE_NOTE_IDS as readonly string[]).includes(value)
  );
}

export type SocialTieStatus =
  | 'none'
  | 'outgoing'
  | 'incoming'
  | 'friends'
  | 'blocked';

export type SocialRequestStatus = 'pending' | 'accepted' | 'ignored';

export interface SocialPerson {
  accountId: string;
  name: string;
  avatar: number;
}

export interface SocialRequestView {
  id: string;
  from: SocialPerson;
  to: SocialPerson;
  createdAt: number;
}

export interface SocialInviteView {
  id: string;
  from: SocialPerson;
  to: SocialPerson;
  noteId: TableInviteNoteId;
  roomCode: string;
  createdAt: number;
}

export interface SocialListRequest {
  clientId?: string;
  initData?: string;
  /** Live seat token — fills `mates` for the current table. */
  token?: string;
  name?: string;
  avatar?: number;
}

export interface SocialListResponse {
  friends: SocialPerson[];
  incomingRequests: SocialRequestView[];
  outgoingRequests: SocialRequestView[];
  incomingInvites: SocialInviteView[];
  outgoingInvites: SocialInviteView[];
  blocked: SocialPerson[];
  mates: Record<string, SocialTieStatus>;
}

export interface SocialFriendRequestBody {
  /** Live game-over seat. Use this or `accountId`, not both. */
  playerId?: string;
  /** Someone you sat with in a finished match. */
  accountId?: string;
  clientId?: string;
  initData?: string;
  name: string;
  avatar?: number;
}

export interface SocialInviteRequestBody {
  accountId: string;
  noteId: TableInviteNoteId;
  clientId?: string;
  initData?: string;
  name: string;
  avatar?: number;
}

export interface SocialAccountActionBody {
  accountId: string;
  clientId?: string;
  initData?: string;
  name?: string;
  avatar?: number;
}

export interface SocialInviteSendResponse {
  invite: SocialInviteView;
}
