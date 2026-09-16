import { createSignal } from 'solid-js';
import {
  HOME_TABLE_INVITE_NOTE,
  type SocialInviteSendResponse,
  type SocialListRequest,
  type SocialListResponse,
  type SocialTieStatus,
  type TableInviteNoteId,
} from '@secret-hitler/shared';
import { RoomApiError, type GameStateService, type RoomSession } from './GameStateService';

const EMPTY: SocialListResponse = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  incomingInvites: [],
  outgoingInvites: [],
  blocked: [],
  mates: {},
};

export interface SocialIdentity {
  clientId?: string;
  initData?: string;
  name: string;
  avatar: number;
  token?: string;
}

/** Friend list and table invites. The server owns the rules. */
export class SocialService {
  private readonly snapshotSignal = createSignal<SocialListResponse>(EMPTY);
  readonly snapshot = this.snapshotSignal[0];
  private readonly setSnapshot = this.snapshotSignal[1];
  private readonly invitingSignal = createSignal<string | null>(null);
  readonly invitingId = this.invitingSignal[0];
  private readonly setInvitingId = this.invitingSignal[1];

  constructor(private readonly game: GameStateService) {}

  mateStatus(playerId: string): SocialTieStatus {
    return this.snapshot().mates[playerId] ?? 'none';
  }

  async load(identity: SocialIdentity): Promise<void> {
    const body: SocialListRequest = {
      clientId: identity.clientId,
      initData: identity.initData,
      name: identity.name,
      avatar: identity.avatar,
      token: identity.token,
    };
    const next = await this.request<SocialListResponse>('/api/social/list', body);
    this.setSnapshot(next);
  }

  async requestFriend(playerId: string, identity: SocialIdentity): Promise<void> {
    await this.request('/api/social/friends', {
      playerId,
      clientId: identity.clientId,
      initData: identity.initData,
      name: identity.name,
      avatar: identity.avatar,
    });
    await this.load(identity);
  }

  async acceptFriendRequest(id: string, identity: SocialIdentity): Promise<void> {
    await this.request(`/api/social/friends/${encodeURIComponent(id)}/accept`, {
      clientId: identity.clientId,
      initData: identity.initData,
      name: identity.name,
      avatar: identity.avatar,
    });
    await this.load(identity);
  }

  async ignoreFriendRequest(id: string, identity: SocialIdentity): Promise<void> {
    await this.request(`/api/social/friends/${encodeURIComponent(id)}/ignore`, {
      clientId: identity.clientId,
      initData: identity.initData,
      name: identity.name,
      avatar: identity.avatar,
    });
    await this.load(identity);
  }

  async inviteFriend(
    accountId: string,
    identity: SocialIdentity,
    noteId: TableInviteNoteId = HOME_TABLE_INVITE_NOTE,
  ): Promise<RoomSession> {
    this.setInvitingId(accountId);
    try {
      if (this.game.queued()) await this.game.leaveMatchQueue();
      const response = await this.request<SocialInviteSendResponse>('/api/social/invites', {
        accountId,
        noteId,
        clientId: identity.clientId,
        initData: identity.initData,
        name: identity.name,
        avatar: identity.avatar,
      });
      await this.load(identity);
      if (!response.seat) {
        throw new RoomApiError('NETWORK', 'Invite did not open a table.');
      }
      return this.game.adoptSeat(response.seat);
    } finally {
      this.setInvitingId(null);
    }
  }

  async acceptInvite(id: string, identity: SocialIdentity): Promise<RoomSession> {
    const seat = await this.request<RoomSession>(
      `/api/social/invites/${encodeURIComponent(id)}/accept`,
      {
        clientId: identity.clientId,
        initData: identity.initData,
        name: identity.name,
        avatar: identity.avatar,
      },
    );
    await this.load(identity);
    return this.game.adoptSeat(seat);
  }

  async ignoreInvite(id: string, identity: SocialIdentity): Promise<void> {
    await this.request(`/api/social/invites/${encodeURIComponent(id)}/ignore`, {
      clientId: identity.clientId,
      initData: identity.initData,
      name: identity.name,
      avatar: identity.avatar,
    });
    await this.load(identity);
  }

  private async request<T>(url: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new RoomApiError('NETWORK', 'Could not reach the server.');
    }
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      code?: RoomApiError['code'];
    };
    if (!response.ok) {
      throw new RoomApiError(payload.code ?? 'NETWORK', payload.error ?? 'Request failed.');
    }
    return payload as T;
  }
}
