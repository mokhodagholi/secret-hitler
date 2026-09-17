import type { WebSocket } from 'ws';
import {
  CHAT_SLOWMODE_MS,
  DEFAULT_FLAGS,
  HOST_MIGRATION_GRACE_MS,
  LIVE_ROOM_RECONNECT_GRACE_MS,
  LOBBY_AFK_MS,
  LOBBY_DISCONNECT_MS,
  PUBLIC_TABLE_MAX_PLAYERS,
  PUBLIC_TABLE_NAME,
  Phase,
  WS_IDLE_CHECK_MS,
  WS_IDLE_MS,
  MessageRouter,
  isPublicTable,
  parseClientMessage,
  type ClientMessage,
  type EngineError,
  type FeatureFlags,
  type GameEngine,
  type GameStateView,
  type RoomClosedReason,
  type ServerErrorCode,
  type ServerMessage,
} from '@secret-hitler/shared';
import { ConnectionRegistry } from './ConnectionRegistry';
import { RateLimiter } from '../util/RateLimiter';
import type { RoomEntry, RoomRepository } from '../rooms/RoomRepository';
import {
  needsReconnectGrace,
  shouldKeepEmptyRoom,
  shouldPersistLiveRoom,
} from '../rooms/liveRoomPolicy';
import type { TokenStore } from '../rooms/TokenStore';
import type { BaleSeatIndex } from '../bale/BaleSeatIndex';
import type { LiveRoomStore } from '../rooms/LiveRoomStore';
import type { VoiceHub } from '../voice/VoiceHub';
import type { BaleRuntime } from '../bale/webhook';
import { formatKickVoteLetter } from '../bale/support';
import { createGroupClosedReply } from '../bale/commands';
import { MatchQueue } from '../rooms/MatchQueue';
import { ProductTracker } from '../product/ProductTracker';
import type { LobbyDeathReason } from '../product/ProductStore';

/** Resolved per-message context for an authenticated socket. */
interface GameContext {
  ws: WebSocket;
  entry: RoomEntry;
  engine: GameEngine;
  playerId: string;
}

/**
 * Bridges raw WebSocket traffic and the game engine. Validates and
 * deserializes inbound {@link ClientMessage}s into engine calls, and
 * subscribes to each engine's events to broadcast per-viewer state snapshots
 * back out.
 */
export class SocketHandler {
  private readonly connections = new ConnectionRegistry();
  /** Which room a given live socket has authenticated into. */
  private readonly socketRoom = new WeakMap<WebSocket, string>();
  /** Per-room discussion-window deadline timers. */
  private readonly discussionTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Per-room vote-window deadline timers. */
  private readonly voteTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Per-room legislative choice-window deadline timers. */
  private readonly legislativeTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Per-room nomination-window deadline timers. */
  private readonly nominationTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Per-room executive-power deadline timers. */
  private readonly specialPowerTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Per-room announce-breath deadline timers. */
  private readonly breathTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Per-room table kick-vote deadline timers. */
  private readonly kickVoteTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Per-room public-table must-choose deadline timers. */
  private readonly startChoiceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Per-player lobby AFK timers. */
  private readonly lobbyAfkTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Per-room pending host-migration timers (disconnect grace period). */
  private readonly hostGraceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** In-progress rooms that just came back from disk — keep them while empty. */
  private readonly reconnectGrace = new Map<string, ReturnType<typeof setTimeout>>();
  /** Serialize durable writes so a token issue cannot lose a racing snapshot. */
  private readonly persistChain = new Map<string, Promise<void>>();
  /** One table-chat line per player, then a pause. */
  private readonly chatLimiter = new RateLimiter(1, CHAT_SLOWMODE_MS);
  /** Last inbound traffic per live socket — silent drops never fire `close`. */
  private readonly socketLastSeen = new Map<WebSocket, number>();
  private readonly matchQueue = new MatchQueue();
  private readonly idleWatch: ReturnType<typeof setInterval>;
  private readonly router: MessageRouter<ClientMessage, GameContext>;
  /** Why the current empty-lobby drop happened, if we already know. */
  private readonly lobbyDeathReason = new Map<string, LobbyDeathReason>();

  /** History attach — set after construction so the recorder can exist first. */
  onRoomCreated: ((entry: RoomEntry) => void) | null = null;
  /** Product funnel; tests leave the default no-op tracker. */
  product = new ProductTracker();

  constructor(
    private readonly repo: RoomRepository,
    private readonly tokens: TokenStore,
    private readonly seats: BaleSeatIndex | null = null,
    private readonly live: LiveRoomStore | null = null,
    private readonly bale: BaleRuntime | null = null,
    private readonly flags: FeatureFlags = DEFAULT_FLAGS,
    private readonly voice: VoiceHub | null = null,
    private readonly telegram: BaleRuntime | null = null,
    private readonly now: () => number = Date.now,
    private readonly idleMs: number = WS_IDLE_MS,
  ) {
    this.router = this.buildRouter();
    this.idleWatch = setInterval(() => this.sweepIdleSockets(), WS_IDLE_CHECK_MS);
    if (typeof this.idleWatch === 'object' && 'unref' in this.idleWatch) {
      this.idleWatch.unref();
    }
  }

  /** Keep one empty public salon. Drop leftover extra waiting publics. */
  ensurePublicLobby(): void {
    if (!this.flags.publicTable) return;
    const waiting = this.repo.waitingPublicLobbies();
    for (const extra of waiting.slice(1)) {
      this.removeRoom(extra.room.id);
    }
    const keep = this.repo.waitingPublicLobby();
    if (keep) {
      keep.engine.applyPublicSeatCap(PUBLIC_TABLE_MAX_PLAYERS);
      return;
    }
    const created = this.repo.create({ name: PUBLIC_TABLE_NAME, kind: 'public' });
    this.registerEngine(created);
    this.onRoomCreated?.(created);
    void this.persistRoom(created.room.id);
  }

  /** Sit the evergreen Join salon. First sitter becomes host. */
  sitPublicLobby(args: {
    name: string;
    avatar?: number;
    joinKey: string | null;
  }):
    | { roomId: string; code: string; token: string; playerId: string }
    | { error: EngineError } {
    this.ensurePublicLobby();
    const entry = this.repo.waitingPublicLobby();
    if (!entry) {
      return { error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } };
    }
    if (args.joinKey && entry.room.bannedJoinKeys.has(args.joinKey)) {
      return { error: { code: 'BANNED', message: 'You cannot sit at this table.' } };
    }
    if (args.joinKey) {
      const already = entry.room.players.find((player) => player.joinKey === args.joinKey);
      if (already) {
        const token = this.tokens.issue({ roomId: entry.room.id, playerId: already.id });
        return {
          roomId: entry.room.id,
          code: entry.room.code,
          token,
          playerId: already.id,
        };
      }
    }
    const player = entry.engine.addPlayer(args.name, false, args.avatar, args.joinKey);
    if ('code' in player) {
      return { error: player };
    }
    const token = this.tokens.issue({ roomId: entry.room.id, playerId: player.id });
    void this.persistRoom(entry.room.id);
    return {
      roomId: entry.room.id,
      code: entry.room.code,
      token,
      playerId: player.id,
    };
  }

  /** Sit in Find Match. Same identity may re-queue and keep their token. */
  enqueueMatch(args: {
    name: string;
    avatar?: number;
    joinKey: string | null;
  }): { token: string; playerId: string; waiting: number; max: number } {
    const entry = this.matchQueue.enqueue(args);
    this.broadcastMatchStatus();
    return {
      token: entry.token,
      playerId: entry.id,
      waiting: this.matchQueue.size,
      max: this.matchQueue.max,
    };
  }

  leaveMatchQueue(token: string): void {
    const entry = this.matchQueue.lookup(token);
    if (!entry) return;
    this.matchQueue.remove(entry.id);
    this.broadcastMatchStatus();
  }

  leaveMatchQueueByJoinKey(joinKey: string): void {
    const entry = this.matchQueue.lookupByJoinKey(joinKey);
    if (!entry) return;
    this.matchQueue.remove(entry.id);
    this.broadcastMatchStatus();
  }

  matchStatus(): { waiting: number; max: number } {
    this.ensurePublicLobby();
    const salon = this.repo.waitingPublicLobby();
    const waiting = salon
      ? salon.room.players.filter((player) => player.connected).length
      : 0;
    return { waiting, max: PUBLIC_TABLE_MAX_PLAYERS };
  }

  /** Join keys in the Find Match queue — lobby fill must not DM them. */
  queuedJoinKeys(): string[] {
    return this.matchQueue.joinKeys();
  }

  /** Drop pending timers so a Fastify close does not keep the process. */
  dispose(): void {
    clearInterval(this.idleWatch);
    this.socketLastSeen.clear();
    for (const roomId of this.startChoiceTimers.keys()) this.stopStartChoiceTimer(roomId);
    for (const playerId of [...this.lobbyAfkTimers.keys()]) {
      this.armLobbyAfk('', playerId, null);
    }
  }

  /** Drop sockets that went quiet without a clean close (phone sleep / kill). */
  sweepIdleSockets(now = this.now()): void {
    const cutoff = now - this.idleMs;
    for (const [ws, lastSeen] of this.socketLastSeen) {
      if (lastSeen >= cutoff) continue;
      this.socketLastSeen.delete(ws);
      ws.terminate();
    }
  }

  /** Authenticated client messages — `auth` is handled before dispatch. */
  private buildRouter(): MessageRouter<ClientMessage, GameContext> {
    return new MessageRouter<ClientMessage, GameContext>()
      .on('player:ready', (_m, ctx) => ctx.engine.setReady(ctx.playerId, true))
      .on('player:unready', (_m, ctx) => ctx.engine.setReady(ctx.playerId, false))
      .on('player:wantStart', (_m, ctx) => this.fail(ctx, ctx.engine.setWantStart(ctx.playerId, true)))
      .on('player:retractStart', (_m, ctx) =>
        this.fail(ctx, ctx.engine.setWantStart(ctx.playerId, false)),
      )
      .on('game:start', (_m, ctx) => this.fail(ctx, ctx.engine.startGame(ctx.playerId)))
      .on('game:continue', (_m, ctx) =>
        this.fail(ctx, ctx.engine.continuePlaying(ctx.playerId)),
      )
      .on('player:kick', (m, ctx) => this.kickPlayer(ctx, m.playerId))
      .on('kick:request', (m, ctx) => {
        if (!this.kickAllowed(ctx.entry)) {
          this.sendError(ctx.ws, 'INVALID_ACTION', 'Kick is not enabled.');
          return;
        }
        this.fail(ctx, ctx.engine.requestKick(ctx.playerId, m.playerId));
      })
      .on('kick:vote', (m, ctx) => this.fail(ctx, ctx.engine.voteKick(ctx.playerId, m.agree)))
      .on('chat:message', (m, ctx) => {
        if (!this.chatLimiter.allow(ctx.playerId)) {
          this.sendError(ctx.ws, 'RATE_LIMITED', 'You are sending messages too quickly.');
          return;
        }
        ctx.engine.postChat(ctx.playerId, m.text);
      })
      .on('command', (m, ctx) =>
        this.fail(ctx, ctx.engine.handleCommand(ctx.playerId, m.command)),
      )
      .on('room:leave', (_m, ctx) => this.leaveRoom(ctx))
      .on('ping', (_m, ctx) => this.sendTo(ctx.ws, { type: 'pong' }))
      .on('voice:join', (_m, ctx) => this.runVoice(ctx, () => this.voiceJoin(ctx)))
      .on('voice:leave', (_m, ctx) => this.runVoice(ctx, () => this.voiceLeave(ctx)))
      .on('voice:createTransport', (m, ctx) =>
        this.runVoice(ctx, () => this.voiceCreateTransport(ctx, m.direction)),
      )
      .on('voice:connectTransport', (m, ctx) =>
        this.runVoice(ctx, () => this.voiceConnectTransport(ctx, m)),
      )
      .on('voice:produce', (m, ctx) => this.runVoice(ctx, () => this.voiceProduce(ctx, m)))
      .on('voice:consume', (m, ctx) => this.runVoice(ctx, () => this.voiceConsume(ctx, m)))
      .on('voice:resumeConsumer', (m, ctx) =>
        this.runVoice(ctx, () => this.voiceResumeConsumer(ctx, m.consumerId)),
      )
      .on('voice:mute', (m, ctx) => this.runVoice(ctx, () => this.voiceMute(ctx, m.muted)))
      .on('voice:speaking', (m, ctx) => this.runVoice(ctx, () => this.voiceSpeaking(ctx, m.speaking)));
  }

  /** Wire an engine's events to the connection layer. Call once per room. */
  registerEngine(entry: RoomEntry): void {
    const { engine, room } = entry;

    engine.on('stateChanged', () => {
      this.syncVoiceSeats(room.id);
      for (const player of room.players) {
        if (this.connections.isConnected(player.id)) {
          this.connections.send(player.id, {
            type: 'state',
            state: this.viewerState(room.id, player.id),
          });
        }
      }
      void this.persistRoom(room.id);
      this.product.lobbySeatsChanged(room);
      this.dropEmptyRoomIfUnkept(room.id);
    });

    engine.on('roleAssigned', ({ playerId }) => {
      const role = room.findPlayer(playerId)?.role;
      if (role) this.connections.send(playerId, { type: 'private', role });
    });

    engine.on('chat', ({ message }) => this.broadcast(room.id, { type: 'chat', message }));
    engine.on('log', ({ entry: e }) => this.broadcast(room.id, { type: 'log', entry: e }));
    // The discussion window closes on its own; the nomination window then opens.
    engine.on('discussionTimerChanged', ({ endsAt }) => {
      this.stopDiscussionTimer(room.id);
      if (endsAt == null) return;
      const timer = setTimeout(() => {
        this.repo.get(room.id)?.engine.resolveDiscussionTimeout();
      }, Math.max(0, endsAt - Date.now()));
      this.discussionTimers.set(room.id, timer);
    });
    // The vote window closes on its own; unvoted players default to Nein.
    engine.on('voteTimerChanged', ({ endsAt }) => {
      this.stopVoteTimer(room.id);
      if (endsAt == null) return;
      const timer = setTimeout(() => {
        this.repo.get(room.id)?.engine.resolveVoteTimeout();
      }, Math.max(0, endsAt - Date.now()));
      this.voteTimers.set(room.id, timer);
    });
    // The legislative window closes on its own; the engine picks at random.
    engine.on('legislativeTimerChanged', ({ endsAt }) => {
      this.stopLegislativeTimer(room.id);
      if (endsAt == null) return;
      const timer = setTimeout(() => {
        this.repo.get(room.id)?.engine.resolveLegislativeTimeout();
      }, Math.max(0, endsAt - Date.now()));
      this.legislativeTimers.set(room.id, timer);
    });
    // The nomination window closes on its own; the election then fails.
    engine.on('nominationTimerChanged', ({ endsAt }) => {
      this.stopNominationTimer(room.id);
      if (endsAt == null) return;
      const timer = setTimeout(() => {
        this.repo.get(room.id)?.engine.resolveNominationTimeout();
      }, Math.max(0, endsAt - Date.now()));
      this.nominationTimers.set(room.id, timer);
    });
    engine.on('specialPowerTimerChanged', ({ endsAt }) => {
      this.stopSpecialPowerTimer(room.id);
      if (endsAt == null) return;
      const timer = setTimeout(() => {
        this.repo.get(room.id)?.engine.resolveSpecialPowerTimeout();
      }, Math.max(0, endsAt - Date.now()));
      this.specialPowerTimers.set(room.id, timer);
    });
    engine.on('breathTimerChanged', ({ endsAt }) => {
      this.stopBreathTimer(room.id);
      if (endsAt == null) return;
      const timer = setTimeout(() => {
        this.repo.get(room.id)?.engine.resolveBreathTimeout();
      }, Math.max(0, endsAt - Date.now()));
      this.breathTimers.set(room.id, timer);
    });
    engine.on('kickVoteTimerChanged', ({ endsAt }) => {
      this.stopKickVoteTimer(room.id);
      if (endsAt == null) return;
      const timer = setTimeout(() => {
        this.repo.get(room.id)?.engine.resolveKickVoteTimeout();
      }, Math.max(0, endsAt - Date.now()));
      this.kickVoteTimers.set(room.id, timer);
    });
    engine.on('kickVoteResolved', (result) => {
      this.product.kickVoteResolved(room);
      this.postKickVoteNotice(room.id, result);
      if (result.kicked) this.ejectPlayer(result.targetId);
      this.fillReservedFromQueue(this.repo.get(room.id) ?? null);
    });
    engine.on('startChoiceTimerChanged', ({ endsAt }) => {
      this.stopStartChoiceTimer(room.id);
      if (endsAt == null) return;
      const timer = setTimeout(() => {
        this.withLobbyDeath(room.id, 'afk_kick', () => {
          this.repo.get(room.id)?.engine.resolveStartChoiceTimeout();
        });
      }, Math.max(0, endsAt - Date.now()));
      this.startChoiceTimers.set(room.id, timer);
    });
    engine.on('lobbyAfkTimerChanged', ({ playerId, dueAt }) => {
      this.armLobbyAfk(room.id, playerId, dueAt);
    });
    engine.on('lobbyPlayersEjected', ({ playerIds }) => {
      this.product.afkKicked(room, playerIds.length);
      for (const playerId of playerIds) this.ejectPlayer(playerId, 'AFK');
      const remaining = this.repo.get(room.id);
      this.fillReservedFromQueue(remaining ?? null);
      if (remaining) this.dropEmptyRoomIfUnkept(remaining.room.id);
    });
    engine.on('gameStarted', () => {
      this.product.tableDealt(room);
      this.ensurePublicLobby();
    });
    engine.on('gameOver', () => {
      this.product.gameFinished(room);
    });
  }

  /**
   * Wire a room that survived a process restart. Occupied lobbies and
   * in-progress matches get a reconnect window so `isEmpty` does not delete
   * them before anyone returns. Finished games look empty and are dropped.
   */
  adoptRestored(entry: RoomEntry): void {
    this.registerEngine(entry);
    if (needsReconnectGrace(entry.room)) {
      this.beginReconnectGrace(entry.room.id);
    } else if (this.dropEmptyRoomIfUnkept(entry.room.id)) {
      return;
    }
    this.restoreDeadlines(entry);
    this.scheduleHostGrace(entry.room.id);
  }

  /** Snapshot room + tokens. Chained per room so the last write wins. */
  persistRoom(roomId: string): Promise<void> {
    if (!this.live) return Promise.resolve();
    return this.enqueuePersist(roomId, () => this.flushPersist(roomId));
  }

  private enqueuePersist(roomId: string, work: () => Promise<void>): Promise<void> {
    const next = (this.persistChain.get(roomId) ?? Promise.resolve())
      .catch(() => undefined)
      .then(work);
    const tracked = next.catch((error) => {
      console.error(`Failed to persist live room ${roomId}`, error);
    });
    this.persistChain.set(roomId, tracked);
    return tracked;
  }

  private async flushPersist(roomId: string): Promise<void> {
    if (!this.live) return;
    const entry = this.repo.get(roomId);
    if (!entry) return;
    if (!shouldPersistLiveRoom(entry.room)) {
      await this.live.remove(roomId);
      return;
    }
    await this.live.save(roomId, entry.room.code, {
      room: entry.room.toSnapshot(),
      tokens: this.tokens.listForRoom(roomId),
    });
  }

  /** Drop an empty hosted / finished table; public lobby and grace stay. */
  private dropEmptyRoomIfUnkept(roomId: string): boolean {
    const entry = this.repo.get(roomId);
    if (!entry?.room.isEmpty) return false;
    if (shouldKeepEmptyRoom(entry.room, this.reconnectGrace.has(roomId))) return false;
    this.noticeGroupRoomClosed(entry);
    this.removeRoom(roomId);
    this.ensurePublicLobby();
    return true;
  }

  private withLobbyDeath(roomId: string, reason: LobbyDeathReason, work: () => void): void {
    this.lobbyDeathReason.set(roomId, reason);
    try {
      work();
    } finally {
      this.lobbyDeathReason.delete(roomId);
    }
  }

  private restoreDeadlines(entry: RoomEntry): void {
    const { room } = entry;
    if (room.kickVote) {
      this.armTimer(this.kickVoteTimers, room.id, room.kickVote.endsAt, () => {
        this.repo.get(room.id)?.engine.resolveKickVoteTimeout();
      });
      return;
    }
    this.armTimer(this.discussionTimers, room.id, room.discussionEndsAt, () => {
      this.repo.get(room.id)?.engine.resolveDiscussionTimeout();
    });
    this.armTimer(this.voteTimers, room.id, room.voteEndsAt, () => {
      this.repo.get(room.id)?.engine.resolveVoteTimeout();
    });
    this.armTimer(this.legislativeTimers, room.id, room.legislativeEndsAt, () => {
      this.repo.get(room.id)?.engine.resolveLegislativeTimeout();
    });
    this.armTimer(this.nominationTimers, room.id, room.nominationEndsAt, () => {
      this.repo.get(room.id)?.engine.resolveNominationTimeout();
    });
    this.armTimer(this.specialPowerTimers, room.id, room.specialPowerEndsAt, () => {
      this.repo.get(room.id)?.engine.resolveSpecialPowerTimeout();
    });
    if (room.pendingBreath) {
      this.armTimer(this.breathTimers, room.id, room.pendingBreath.endsAt, () => {
        this.repo.get(room.id)?.engine.resolveBreathTimeout();
      });
    }
    if (room.startChoice) {
      this.armTimer(this.startChoiceTimers, room.id, room.startChoice.endsAt, () => {
        this.repo.get(room.id)?.engine.resolveStartChoiceTimeout();
      });
    }
    for (const player of room.players) {
      this.armLobbyAfk(room.id, player.id, this.restoredLobbyAfkDueAt(room, player));
    }
  }

  private restoredLobbyAfkDueAt(
    room: RoomEntry['room'],
    player: RoomEntry['room']['players'][number],
  ): number | null {
    if (room.phase !== Phase.Lobby || player.unreadySince == null) return null;
    // Deploy looks like every seat disconnected; wait for reconnect grace.
    if (!player.connected) {
      if (this.reconnectGrace.has(room.id)) return null;
      return player.unreadySince + LOBBY_DISCONNECT_MS;
    }
    if (room.startChoice != null || room.kickVote != null) return null;
    const idle = isPublicTable(room.options) ? !player.wantsStart : !player.ready;
    if (!idle || player.isHost || player.id === room.hostId) return null;
    return player.unreadySince + LOBBY_AFK_MS;
  }

  private armTimer(
    timers: Map<string, ReturnType<typeof setTimeout>>,
    roomId: string,
    endsAt: number,
    onTimeout: () => void,
  ): void {
    const existing = timers.get(roomId);
    if (existing) {
      clearTimeout(existing);
      timers.delete(roomId);
    }
    if (endsAt <= 0) return;
    const timer = setTimeout(onTimeout, Math.max(0, endsAt - Date.now()));
    timers.set(roomId, timer);
  }

  private beginReconnectGrace(roomId: string): void {
    this.clearReconnectGrace(roomId);
    const timer = setTimeout(() => {
      this.reconnectGrace.delete(roomId);
      this.dropUnrestoredLobbySeats(roomId);
      this.dropEmptyRoomIfUnkept(roomId);
    }, LIVE_ROOM_RECONNECT_GRACE_MS);
    this.reconnectGrace.set(roomId, timer);
  }

  /** Seats that never came back after a restart leave the waiting room. */
  private dropUnrestoredLobbySeats(roomId: string): void {
    const entry = this.repo.get(roomId);
    if (!entry || entry.room.phase !== Phase.Lobby) return;
    const staleIds = entry.room.players
      .filter((player) => !player.connected)
      .map((player) => player.id);
    for (const playerId of staleIds) {
      const remaining = this.repo.get(roomId);
      if (!remaining) return;
      this.dropSeat(remaining, playerId);
    }
  }

  private clearReconnectGrace(roomId: string): void {
    const timer = this.reconnectGrace.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectGrace.delete(roomId);
    }
  }

  private stopDiscussionTimer(roomId: string): void {
    const timer = this.discussionTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.discussionTimers.delete(roomId);
    }
  }

  private stopVoteTimer(roomId: string): void {
    const timer = this.voteTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.voteTimers.delete(roomId);
    }
  }

  private stopLegislativeTimer(roomId: string): void {
    const timer = this.legislativeTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.legislativeTimers.delete(roomId);
    }
  }

  private stopNominationTimer(roomId: string): void {
    const timer = this.nominationTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.nominationTimers.delete(roomId);
    }
  }

  private stopSpecialPowerTimer(roomId: string): void {
    const timer = this.specialPowerTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.specialPowerTimers.delete(roomId);
    }
  }

  private stopBreathTimer(roomId: string): void {
    const timer = this.breathTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.breathTimers.delete(roomId);
    }
  }

  private stopKickVoteTimer(roomId: string): void {
    const timer = this.kickVoteTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.kickVoteTimers.delete(roomId);
    }
  }

  private stopStartChoiceTimer(roomId: string): void {
    const timer = this.startChoiceTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.startChoiceTimers.delete(roomId);
    }
  }

  private armLobbyAfk(roomId: string, playerId: string, dueAt: number | null): void {
    const existing = this.lobbyAfkTimers.get(playerId);
    if (existing) {
      clearTimeout(existing);
      this.lobbyAfkTimers.delete(playerId);
    }
    if (dueAt == null) return;
    const timer = setTimeout(() => {
      this.lobbyAfkTimers.delete(playerId);
      this.withLobbyDeath(roomId, 'afk_kick', () => {
        this.repo.get(roomId)?.engine.resolveLobbyAfkTimeout(playerId);
      });
    }, Math.max(0, dueAt - Date.now()));
    if (typeof timer === 'object' && 'unref' in timer) timer.unref();
    this.lobbyAfkTimers.set(playerId, timer);
  }

  /** Attach handlers to a freshly upgraded socket. */
  handleConnection(ws: WebSocket): void {
    this.touchSocket(ws);
    ws.on('message', (data) => {
      this.touchSocket(ws);
      this.onMessage(ws, data.toString());
    });
    ws.on('close', () => {
      this.socketLastSeen.delete(ws);
      this.onClose(ws);
    });
    ws.on('error', () => ws.close());
  }

  private touchSocket(ws: WebSocket): void {
    this.socketLastSeen.set(ws, this.now());
  }

  private onMessage(ws: WebSocket, raw: string): void {
    // Structural validation — a malformed frame must never reach the engine.
    const msg = parseClientMessage(raw);
    if (!msg) return;

    if (msg.type === 'auth') {
      this.onAuth(ws, msg.token);
      return;
    }

    const context = this.contextFor(ws);
    if (!context) {
      if (msg.type === 'ping') {
        this.sendTo(ws, { type: 'pong' });
        return;
      }
      if (msg.type === 'match:cancel') {
        this.cancelQueuedSocket(ws);
        return;
      }
      this.sendError(ws, 'AUTH_FAILED', 'Authenticate before sending messages.');
      return;
    }
    try {
      this.router.dispatch(msg, context);
    } catch (error) {
      // One bad message must not take down every room on the process.
      console.error('Unhandled error dispatching client message', error);
      this.sendError(ws, 'INVALID_ACTION', 'That action failed unexpectedly.');
    }
  }

  private contextFor(ws: WebSocket): GameContext | null {
    const roomId = this.socketRoom.get(ws);
    const playerId = this.connections.playerFor(ws);
    if (!roomId || !playerId) return null;
    const entry = this.repo.get(roomId);
    if (!entry) return null;
    return { ws, entry, engine: entry.engine, playerId };
  }

  private fail(context: GameContext, error: EngineError | null): void {
    if (error) this.sendError(context.ws, error.code, error.message);
  }

  private voiceReady(): boolean {
    return this.flags.voice && this.voice != null;
  }

  private runVoice(context: GameContext, work: () => void | Promise<void>): void {
    if (!this.voiceReady()) {
      this.sendError(context.ws, 'INVALID_ACTION', 'Voice is not enabled.');
      return;
    }
    void Promise.resolve(work()).catch((error) => {
      console.error('Voice action failed', error);
      this.sendError(context.ws, 'INVALID_ACTION', 'Voice action failed.');
    });
  }

  private viewerState(roomId: string, playerId: string): GameStateView {
    const room = this.repo.get(roomId)?.room;
    if (!room) {
      throw new Error('room is missing');
    }
    const state = room.viewFor(playerId);
    return this.voice ? this.voice.decorateView(state) : state;
  }

  private syncVoiceSeats(roomId: string): void {
    if (!this.voice) return;
    const room = this.repo.get(roomId)?.room;
    if (!room) return;
    for (const player of room.players) {
      void this.voice.applySeat(player.id, player.isAlive && player.connected);
    }
  }

  private async voiceJoin(context: GameContext): Promise<void> {
    const roomId = context.entry.room.id;
    await this.voice!.prepareRoom(roomId);
    const caps = this.voice!.capabilities(roomId);
    this.sendTo(context.ws, {
      type: 'voice:capabilities',
      rtpCapabilities: caps.rtpCapabilities,
      iceServers: caps.iceServers,
    });
    for (const peer of this.voice!.peers(roomId)) {
      if (peer.playerId === context.playerId) continue;
      this.sendTo(context.ws, {
        type: 'voice:peer',
        playerId: peer.playerId,
        producerId: peer.producerId,
        muted: peer.muted,
      });
    }
  }

  private async voiceLeave(context: GameContext): Promise<void> {
    const producerId = await this.voice!.removePlayer(context.playerId);
    if (producerId == null) return;
    this.broadcast(context.entry.room.id, {
      type: 'voice:peer',
      playerId: context.playerId,
      producerId: null,
      muted: true,
    });
  }

  private async voiceConnectTransport(
    context: GameContext,
    message: Extract<ClientMessage, { type: 'voice:connectTransport' }>,
  ): Promise<void> {
    await this.voice!.connectTransport(
      context.playerId,
      message.transportId,
      message.dtlsParameters,
    );
    this.sendTo(context.ws, { type: 'voice:transportConnected', id: message.transportId });
  }

  private async voiceCreateTransport(
    context: GameContext,
    direction: 'send' | 'recv',
  ): Promise<void> {
    const offer = await this.voice!.createTransport(
      context.entry.room.id,
      context.playerId,
      direction,
    );
    this.sendTo(context.ws, {
      type: 'voice:transportCreated',
      id: offer.id,
      direction,
      iceParameters: offer.iceParameters,
      iceCandidates: offer.iceCandidates,
      dtlsParameters: offer.dtlsParameters,
    });
  }

  private async voiceProduce(
    context: GameContext,
    message: Extract<ClientMessage, { type: 'voice:produce' }>,
  ): Promise<void> {
    const player = context.entry.room.findPlayer(context.playerId);
    if (!player?.isAlive || !player.connected) {
      this.sendError(context.ws, 'INVALID_ACTION', 'Dead or disconnected seats cannot speak.');
      return;
    }
    const produced = await this.voice!.produce(
      context.playerId,
      message.transportId,
      message.rtpParameters,
    );
    this.sendTo(context.ws, {
      type: 'voice:produced',
      id: produced.producerId,
      transportId: message.transportId,
    });
    this.broadcast(context.entry.room.id, {
      type: 'voice:peer',
      playerId: context.playerId,
      producerId: produced.producerId,
      muted: produced.paused,
    });
  }

  private async voiceConsume(
    context: GameContext,
    message: Extract<ClientMessage, { type: 'voice:consume' }>,
  ): Promise<void> {
    const consumed = await this.voice!.consume(
      context.playerId,
      message.producerId,
      message.rtpCapabilities,
    );
    const owner =
      this.voice!.peers(context.entry.room.id).find(
        (peer) => peer.producerId === consumed.producerId,
      )?.playerId ?? '';
    this.sendTo(context.ws, {
      type: 'voice:consumed',
      id: consumed.id,
      producerId: consumed.producerId,
      playerId: owner,
      kind: 'audio',
      rtpParameters: consumed.rtpParameters,
      paused: consumed.paused,
    });
  }

  private async voiceResumeConsumer(context: GameContext, consumerId: string): Promise<void> {
    await this.voice!.resumeConsumer(context.playerId, consumerId);
  }

  private async voiceMute(context: GameContext, muted: boolean): Promise<void> {
    const player = context.entry.room.findPlayer(context.playerId);
    if (!muted && (!player?.isAlive || !player.connected)) {
      this.sendError(context.ws, 'INVALID_ACTION', 'Dead or disconnected seats cannot speak.');
      return;
    }
    const ok = await this.voice!.setMuted(context.playerId, muted);
    if (!ok) return;
    this.broadcast(context.entry.room.id, {
      type: 'voice:peer',
      playerId: context.playerId,
      producerId:
        this.voice!.peers(context.entry.room.id).find((peer) => peer.playerId === context.playerId)
          ?.producerId ?? null,
      muted,
    });
  }

  private voiceSpeaking(context: GameContext, speaking: boolean): void {
    this.broadcast(context.entry.room.id, {
      type: 'voice:speaking',
      playerId: context.playerId,
      speaking,
    });
  }

  /** Lobby kick needs lobbyKick; in-game kick needs gameKick. */
  private kickAllowed(entry: RoomEntry): boolean {
    return entry.room.phase === Phase.Lobby ? this.flags.lobbyKick : this.flags.gameKick;
  }

  /** Host removes a lobby guest (or in-game seat when gameKick is on). */
  private kickPlayer(context: GameContext, targetId: string): void {
    if (!this.kickAllowed(context.entry)) {
      this.sendError(context.ws, 'INVALID_ACTION', 'Kick is not enabled.');
      return;
    }
    const error = context.engine.kickPlayer(context.playerId, targetId);
    if (error) {
      this.fail(context, error);
      return;
    }
    this.ejectPlayer(targetId);
  }

  /** Close the seat: the kicked client gets a notice, then the token is gone. */
  private ejectPlayer(targetId: string, reason: RoomClosedReason = 'KICKED'): void {
    void this.voice?.removePlayer(targetId);
    this.connections.sendAndClose(targetId, {
      type: 'room:closed',
      reason,
    });
    this.tokens.revokePlayer(targetId);
    this.seats?.releasePlayer(targetId);
  }

  private postKickVoteNotice(
    roomId: string,
    result: {
      requesterId: string;
      targetId: string;
      yesCount: number;
      needed: number;
      kicked: boolean;
    },
  ): void {
    const identity = this.seats?.identityFor(result.requesterId);
    const runtime =
      identity?.platform === 'telegram'
        ? this.telegram
        : identity?.platform === 'bale'
          ? this.bale
          : this.bale ?? this.telegram;
    const chatId = runtime?.supportChatId;
    if (chatId == null || !runtime) return;
    const roomCode = this.repo.get(roomId)?.room.code;
    const text = formatKickVoteLetter({
      requesterId: String(identity?.userId ?? result.requesterId),
      targetId: String(this.seats?.identityFor(result.targetId)?.userId ?? result.targetId),
      yesCount: result.yesCount,
      needed: result.needed,
      kicked: result.kicked,
      roomCode,
    });
    void runtime.bot.sendMessage({ chat_id: chatId, text }).catch((error) => {
      console.error('Failed to post kick vote to support chat', error);
    });
  }

  /** Host leave vacates like a guest; an empty hosted table is dropped. */
  dropSeat(entry: RoomEntry, playerId: string): void {
    const player = entry.room.findPlayer(playerId);
    if (!player) return;
    const roomId = entry.room.id;
    const death: LobbyDeathReason =
      player.isHost || player.id === entry.room.hostId ? 'host_left' : 'never_started';
    this.withLobbyDeath(roomId, death, () => {
      void this.voice?.removePlayer(playerId);
      entry.engine.removePlayer(playerId);
      this.tokens.revokePlayer(playerId);
      this.seats?.releasePlayer(playerId);
      this.connections.close(playerId);
      const remaining = this.repo.get(roomId);
      if (!remaining) return;
      if (remaining.room.options.adminPlayUserId != null) {
        this.destroyRoom(remaining);
        return;
      }
      this.fillReservedFromQueue(remaining);
      this.dropEmptyRoomIfUnkept(roomId);
    });
  }

  private leaveRoom(context: GameContext): void {
    this.dropSeat(context.entry, context.playerId);
  }

  /** Rewrite the group `/create` post so the join button does not linger. */
  private noticeGroupRoomClosed(entry: RoomEntry): void {
    const chatId = entry.room.options.originChatId;
    const messageId = entry.room.options.originMessageId;
    const originPlatform = entry.room.options.originPlatform ?? 'bale';
    const runtime = originPlatform === 'telegram' ? this.telegram : this.bale;
    // Call on the bot: a detached editMessageText drops `this` and crashes Node.
    if (chatId == null || messageId == null || !runtime?.bot.editMessageText) return;
    const closed = createGroupClosedReply({ creatorName: entry.room.options.name });
    void runtime.bot.editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: closed.text,
      reply_markup: closed.reply_markup,
    }).catch((error) => {
      console.error('Failed to edit group room post', error);
    });
  }

  /** Kick every remaining connection and drop the room from the repository. */
  private destroyRoom(entry: RoomEntry): void {
    for (const player of entry.room.players) {
      this.connections.close(player.id);
    }
    this.removeRoom(entry.room.id);
  }

  /**
   * Admin `/delete CODE` — tell sitters the table closed, drop the live room,
   * and heal a missing public lobby if that was the evergreen table.
   */
  destroyRoomByCode(code: string): { name: string; code: string } | null {
    const entry = this.repo.getByCode(code);
    if (!entry) return null;
    const snapshot = { name: entry.room.options.name, code: entry.room.code };
    this.noticeGroupRoomClosed(entry);
    for (const player of [...entry.room.players]) {
      this.connections.sendAndClose(player.id, {
        type: 'room:closed',
        reason: 'HOST_LEFT',
      });
    }
    this.removeRoom(entry.room.id);
    this.ensurePublicLobby();
    return snapshot;
  }

  /** Stop the room's timers, revoke its tokens, and drop it from the repo. */
  private removeRoom(roomId: string): void {
    const players = this.repo.get(roomId)?.room.players ?? [];
    for (const player of players) this.armLobbyAfk(roomId, player.id, null);
    this.stopDiscussionTimer(roomId);
    this.stopVoteTimer(roomId);
    this.stopLegislativeTimer(roomId);
    this.stopNominationTimer(roomId);
    this.stopSpecialPowerTimer(roomId);
    this.stopBreathTimer(roomId);
    this.stopKickVoteTimer(roomId);
    this.stopStartChoiceTimer(roomId);
    this.cancelHostGrace(roomId);
    this.clearReconnectGrace(roomId);
    this.tokens.revokeRoom(roomId);
    this.seats?.releaseRoom(roomId);
    const removed = this.repo.get(roomId)?.room;
    const death = this.lobbyDeathReason.get(roomId);
    this.repo.remove(roomId);
    if (removed) this.product.onRoomRemoved(removed, death);
    void this.voice?.removeRoom(roomId);
    if (this.live) {
      void this.enqueuePersist(roomId, () => this.live!.remove(roomId));
    }
  }

  private onAuth(ws: WebSocket, token: string): void {
    const queued = this.matchQueue.lookup(token);
    if (queued) {
      this.connections.bind(queued.id, ws);
      this.matchQueue.bindSocket(queued.id, ws);
      this.sendTo(ws, { type: 'authed', playerId: queued.id, flags: this.flags });
      this.sendTo(ws, {
        type: 'match:status',
        waiting: this.matchQueue.size,
        max: this.matchQueue.max,
      });
      this.tryFormMatch();
      return;
    }

    const claim = this.tokens.lookup(token);
    const entry = claim ? this.repo.get(claim.roomId) : undefined;
    const player = claim && entry ? entry.room.findPlayer(claim.playerId) : undefined;
    if (!entry || !player) {
      this.sendError(ws, 'AUTH_FAILED', 'Invalid or expired token.');
      ws.close(4001, 'auth failed');
      return;
    }

    this.connections.bind(player.id, ws);
    this.socketRoom.set(ws, entry.room.id);
    // Lobby sitters reconnect on different clocks after a deploy.
    if (entry.room.phase !== Phase.Lobby) {
      this.clearReconnectGrace(entry.room.id);
    }
    if (player.id === entry.room.hostId) {
      this.cancelHostGrace(entry.room.id);
    } else if (!entry.room.findPlayer(entry.room.hostId)?.connected) {
      this.scheduleHostGrace(entry.room.id);
    }
    entry.engine.setConnected(player.id, true);

    this.sendTo(ws, { type: 'authed', playerId: player.id, flags: this.flags });
    this.sendTo(ws, { type: 'state', state: this.viewerState(entry.room.id, player.id) });
    if (player.role) this.sendTo(ws, { type: 'private', role: player.role });
  }

  private onClose(ws: WebSocket): void {
    const playerId = this.connections.unbind(ws);
    const roomId = this.socketRoom.get(ws);
    this.socketRoom.delete(ws);
    if (!playerId) return;

    if (!roomId) {
      this.matchQueue.remove(playerId);
      this.broadcastMatchStatus();
      return;
    }
    // Reconnect already bound a newer socket; this close is the leftover.
    if (this.connections.isConnected(playerId)) return;
    this.chatLimiter.clear(playerId);

    const entry = this.repo.get(roomId);
    if (!entry) return;
    entry.engine.setConnected(playerId, false);
    void this.voice?.applySeat(playerId, false);
    this.product.disconnectedInGame(entry.room);
    // A dropped host keeps the seat for a grace period before migration.
    if (playerId === entry.room.hostId) this.scheduleHostGrace(roomId);
  }

  private cancelQueuedSocket(ws: WebSocket): void {
    const playerId = this.connections.playerFor(ws);
    if (!playerId || this.socketRoom.get(ws)) return;
    this.matchQueue.remove(playerId);
    this.broadcastMatchStatus();
  }

  private tryFormMatch(): void {
    this.broadcastMatchStatus();
  }

  /**
   * Find Match queue is retired; leftover waiters are not seated into a
   * reserved six-player table.
   */
  private fillReservedFromQueue(_entry: RoomEntry | null): void {
    this.broadcastMatchStatus();
  }

  private attachQueuedSocket(
    entry: RoomEntry,
    seat: { ws: WebSocket; playerId: string; token: string },
  ): void {
    this.connections.unbind(seat.ws);
    this.connections.bind(seat.playerId, seat.ws);
    this.socketRoom.set(seat.ws, entry.room.id);
    this.sendTo(seat.ws, {
      type: 'match:found',
      roomId: entry.room.id,
      code: entry.room.code,
      token: seat.token,
      playerId: seat.playerId,
    });
    this.sendTo(seat.ws, {
      type: 'authed',
      playerId: seat.playerId,
      flags: this.flags,
    });
    this.sendTo(seat.ws, {
      type: 'state',
      state: this.viewerState(entry.room.id, seat.playerId),
    });
  }

  private broadcastMatchStatus(): void {
    const status: ServerMessage = {
      type: 'match:status',
      waiting: this.matchQueue.size,
      max: this.matchQueue.max,
    };
    this.matchQueue.forEachSocket((ws) => this.sendTo(ws, status));
  }

  private scheduleHostGrace(roomId: string): void {
    const room = this.repo.get(roomId)?.room;
    if (!room || !room.hostId) return;
    this.cancelHostGrace(roomId);
    const timer = setTimeout(() => {
      this.hostGraceTimers.delete(roomId);
      this.repo.get(roomId)?.engine.migrateHostIfDisconnected();
    }, HOST_MIGRATION_GRACE_MS);
    this.hostGraceTimers.set(roomId, timer);
  }

  private cancelHostGrace(roomId: string): void {
    const timer = this.hostGraceTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.hostGraceTimers.delete(roomId);
    }
  }

  private broadcast(roomId: string, message: ServerMessage): void {
    const room = this.repo.get(roomId)?.room;
    if (!room) return;
    for (const player of room.players) {
      this.connections.send(player.id, message);
    }
  }

  private sendTo(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
  }

  private sendError(ws: WebSocket, code: ServerErrorCode, message: string): void {
    this.sendTo(ws, { type: 'error', code, message });
  }
}
