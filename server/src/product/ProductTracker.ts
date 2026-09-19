import {
  Phase,
  isPublicTable,
  type MessengerKind,
  type Room,
} from '@secret-hitler/shared';
import { hourInIran } from './hourInIran';
import { matchOutcomeOf } from './matchOutcome';
import type {
  LobbyDeathReason,
  LobbySource,
  OnboardIntent,
  OnboardStage,
  ProductEventName,
  ProductPlatform,
  ProductStore,
} from './ProductStore';

function lobbySourceOf(room: Room): LobbySource {
  if (isPublicTable(room.options)) return 'public';
  if (room.options.originChatId != null) return 'group';
  return 'hosted';
}

function isTracked(room: Room): boolean {
  return room.options.adminPlayUserId == null;
}

function platformOf(userKey: string | null | undefined): ProductPlatform | null {
  if (!userKey) return null;
  if (userKey.startsWith('telegram:')) return 'telegram';
  if (userKey.startsWith('bale:')) return 'bale';
  if (userKey.startsWith('client:')) return 'browser';
  return null;
}

const ONBOARD_EVENT: Record<OnboardIntent, ProductEventName> = {
  prompt: 'onboard_prompt',
  sit: 'onboard_sit',
  not_now: 'onboard_not_now',
  skip: 'onboard_skip',
  continue: 'onboard_continue',
  got_it: 'onboard_got_it',
  not_yet: 'onboard_not_yet',
  play: 'onboard_play',
};

function messengerChat(userKey: string | null | undefined): {
  platform: MessengerKind;
  chatId: string;
} | null {
  if (!userKey) return null;
  if (userKey.startsWith('bale:')) return { platform: 'bale', chatId: userKey.slice('bale:'.length) };
  if (userKey.startsWith('telegram:')) {
    return { platform: 'telegram', chatId: userKey.slice('telegram:'.length) };
  }
  return null;
}

/**
 * Best-effort product analytics. Persistence failures are logged, never thrown.
 */
export class ProductTracker {
  private pending: Promise<void> = Promise.resolve();

  constructor(private readonly store: ProductStore | null = null) {}

  botStarted(platform: MessengerKind, chatId: string): void {
    this.event('bot_start', { platform, userKey: `${platform}:${chatId}` });
  }

  miniappOpened(
    platform: MessengerKind,
    userId: number | string,
    startParam?: string | null,
  ): void {
    const chatId = String(userId);
    const userKey = `${platform}:${chatId}`;
    this.event('miniapp_auth', {
      platform,
      userKey,
      payload: startParam ? { startParam } : null,
    });
    this.run((store, at) => store.markBlastOpened(platform, chatId, at));
  }

  findMatchQueued(userKey: string | null): void {
    this.event('find_match', { userKey, platform: platformOf(userKey) });
  }

  ownRoomPrompt(userKey: string | null): void {
    this.event('own_room_prompt', { userKey, platform: platformOf(userKey) });
  }

  ownRoomWant(userKey: string | null): void {
    this.event('own_room_want', { userKey, platform: platformOf(userKey) });
  }

  lobbyNudgePrompt(
    userKey: string | null,
    fields: { fromCode?: string; toCode?: string; seats?: number } = {},
  ): void {
    this.event('lobby_nudge_prompt', {
      userKey,
      platform: platformOf(userKey),
      roomCode: fields.fromCode,
      payload: { toCode: fields.toCode, seats: fields.seats },
    });
  }

  lobbyNudgeJoin(
    userKey: string | null,
    fields: { fromCode?: string; toCode?: string; seats?: number } = {},
  ): void {
    this.event('lobby_nudge_join', {
      userKey,
      platform: platformOf(userKey),
      roomCode: fields.toCode,
      payload: { fromCode: fields.fromCode, seats: fields.seats },
    });
  }

  onboard(
    intent: OnboardIntent,
    userKey: string | null,
    fields: { stage?: OnboardStage; beat?: number; count?: number } = {},
  ): void {
    const payload: Record<string, unknown> = {};
    if (fields.stage) payload.stage = fields.stage;
    if (fields.beat != null) payload.beat = fields.beat;
    if (fields.count != null) payload.count = fields.count;
    this.event(ONBOARD_EVENT[intent], {
      userKey,
      platform: platformOf(userKey),
      payload: Object.keys(payload).length > 0 ? payload : null,
    });
  }

  hostedRoomCreated(room: Room, userKey: string | null): void {
    if (!isTracked(room)) return;
    this.event('room_create', {
      userKey,
      platform: platformOf(userKey),
      roomCode: room.code,
      payload: { source: 'hosted' },
    });
    this.seated(room, userKey);
  }

  hostedRoomJoined(room: Room, userKey: string | null): void {
    if (!isTracked(room)) return;
    this.event('room_join', {
      userKey,
      platform: platformOf(userKey),
      roomCode: room.code,
    });
    this.seated(room, userKey);
  }

  groupRoomCreated(room: Room, userKey: string | null): void {
    if (!isTracked(room)) return;
    this.event('group_create', {
      userKey,
      platform: platformOf(userKey),
      roomCode: room.code,
      payload: { source: 'group' },
    });
    this.seated(room, userKey);
  }

  seated(room: Room, userKey: string | null): void {
    if (!isTracked(room)) return;
    this.event('seated', {
      userKey,
      platform: platformOf(userKey),
      roomCode: room.code,
      payload: { source: lobbySourceOf(room) },
    });
    this.lobbySeatsChanged(room);
    const chat = messengerChat(userKey);
    if (chat) this.run((store, at) => store.markBlastSat(chat.platform, chat.chatId, at));
  }

  lobbySeatsChanged(room: Room): void {
    if (!isTracked(room) || room.phase !== Phase.Lobby) return;
    const seats = room.players.length;
    if (seats === 0) return;
    const source = lobbySourceOf(room);
    this.run(async (store, at) => {
      await store.openLobby({
        roomCode: room.code,
        source,
        openedAt: at,
        hourIran: hourInIran(at),
        seats,
      });
      await store.touchLobby(room.code, seats, at);
    });
  }

  tableDealt(room: Room): void {
    if (!isTracked(room)) return;
    this.event('table_dealt', {
      roomCode: room.code,
      payload: { source: lobbySourceOf(room), seats: room.players.length },
    });
    this.run(async (store, at) => {
      await store.markLobbyDealt(room.code, at);
      await store.startMatch(room.code, at);
    });
  }

  gameFinished(room: Room): void {
    if (!isTracked(room)) return;
    const outcome = matchOutcomeOf(room);
    this.event('game_finished', {
      roomCode: room.code,
      payload: { outcome, winner: room.winner },
    });
    if (outcome) this.run((store, at) => store.finishMatch(room.code, outcome, at));
  }

  disconnectedInGame(room: Room): void {
    if (!isTracked(room)) return;
    if (room.phase === Phase.Lobby || room.phase === Phase.GameOver) return;
    this.run((store) => store.incrementMatchDisconnects(room.code));
  }

  kickVoteResolved(room: Room): void {
    if (!isTracked(room)) return;
    this.run((store) => store.incrementMatchKickVotes(room.code));
  }

  afkKicked(room: Room, count: number): void {
    if (!isTracked(room) || count <= 0) return;
    this.run(async (store) => {
      await store.incrementLobbyAfkKicks(room.code, count);
      await store.incrementMatchAfkKicks(room.code, count);
    });
  }

  onRoomRemoved(room: Room, lobbyDeath?: LobbyDeathReason): void {
    if (!isTracked(room)) return;
    if (room.phase === Phase.Lobby) {
      const reason = lobbyDeath ?? 'never_started';
      this.run(async (store, at) => {
        const closed = await store.closeLobby(room.code, reason, at);
        if (!closed) return;
        await store.recordEvent({
          name: 'lobby_died',
          at,
          roomCode: room.code,
          payload: { reason, source: lobbySourceOf(room) },
        });
      });
      return;
    }
    if (room.phase === Phase.GameOver) return;
    this.run(async (store, at) => {
      const abandoned = await store.abandonMatch(room.code, at);
      if (!abandoned) return;
      await store.recordEvent({
        name: 'game_abandoned',
        at,
        roomCode: room.code,
      });
    });
  }

  blastSent(platform: MessengerKind, chatIds: string[]): void {
    this.run((store, at) => store.recordBlast(platform, chatIds, at));
  }

  flush(): Promise<void> {
    return this.pending;
  }

  private event(
    name: ProductEventName,
    fields: {
      platform?: ProductPlatform | null;
      userKey?: string | null;
      roomCode?: string | null;
      payload?: Record<string, unknown> | null;
    } = {},
  ): void {
    this.run((store, at) =>
      store.recordEvent({
        name,
        at,
        platform: fields.platform ?? null,
        userKey: fields.userKey ?? null,
        roomCode: fields.roomCode ?? null,
        payload: fields.payload ?? null,
      }),
    );
  }

  private run(work: (store: ProductStore, at: Date) => Promise<void>): void {
    if (!this.store) return;
    const store = this.store;
    this.pending = this.pending
      .then(() => work(store, new Date()))
      .catch((error) => {
        console.error('Failed to persist product analytics', error);
      });
  }
}
