import type { MessengerKind } from '@secret-hitler/shared';
import { Phase } from '@secret-hitler/shared';
import type { BotSubscriberStore } from '../bale/BotSubscriberStore';
import type { BaleRuntime } from '../bale/webhook';
import { messengerKindOf, startLinkFor } from '../bale/webhook';
import { lobbyFillInviteReply } from '../bale/commands';
import type { RoomRepository } from '../rooms/RoomRepository';
import type { SocketHandler } from '../ws/SocketHandler';
import type { ProductStore } from './ProductStore';
import { invitesForWave, LOBBY_FILL } from './lobbyFill';

export interface LobbyFillDeps {
  repo: RoomRepository;
  sockets: SocketHandler;
  product: ProductStore;
  subscribers?: BotSubscriberStore;
  bale?: BaleRuntime;
  telegram?: BaleRuntime;
  now?: () => number;
  sendDelayMs?: number;
}

interface NeedyRoomState {
  needySince: number;
  lastWaveAt: number;
  invited: Set<string>;
}

type FillFailReason = 'rate_limit' | 'blocked' | 'bad_user_key' | 'other';

type WaveStopReason = 'done' | 'no_candidates' | 'lobby_gone' | 'table_full';

/**
 * When a lobby sits at 2–4 seats, DM a few warm messenger users with a deep
 * link into that room. Gated by FEATURE_LOBBY_FILL. See docs/lobby-fill.md.
 */
export class LobbyFillService {
  private readonly repo: RoomRepository;
  private readonly sockets: SocketHandler;
  private readonly product: ProductStore;
  private readonly subscribers?: BotSubscriberStore;
  private readonly bale?: BaleRuntime;
  private readonly telegram?: BaleRuntime;
  private readonly now: () => number;
  private readonly sendDelayMs: number;
  private readonly needy = new Map<string, NeedyRoomState>();
  private readonly watch: ReturnType<typeof setInterval>;
  private sweeping: Promise<void> | null = null;

  constructor(deps: LobbyFillDeps) {
    this.repo = deps.repo;
    this.sockets = deps.sockets;
    this.product = deps.product;
    this.subscribers = deps.subscribers;
    this.bale = deps.bale;
    this.telegram = deps.telegram;
    this.now = deps.now ?? Date.now;
    this.sendDelayMs = deps.sendDelayMs ?? LOBBY_FILL.sendDelayMs;
    this.watch = setInterval(() => {
      void this.sweep();
    }, LOBBY_FILL.sweepMs);
    if (typeof this.watch === 'object' && 'unref' in this.watch) this.watch.unref();
  }

  dispose(): void {
    clearInterval(this.watch);
    this.needy.clear();
  }

  /** Exposed for tests — runs one pass over live lobbies. */
  async sweep(): Promise<void> {
    if (this.sweeping) return this.sweeping;
    this.sweeping = this.runSweep().finally(() => {
      this.sweeping = null;
    });
    return this.sweeping;
  }

  private async runSweep(): Promise<void> {
    const now = this.now();
    const liveIds = new Set<string>();

    for (const entry of this.repo.listFillableLobbies()) {
      liveIds.add(entry.room.id);
      const seats = entry.room.players.length;
      if (seats < LOBBY_FILL.minSeats || seats > LOBBY_FILL.maxSeats) {
        this.needy.delete(entry.room.id);
        continue;
      }

      let state = this.needy.get(entry.room.id);
      if (!state) {
        state = { needySince: now, lastWaveAt: 0, invited: new Set() };
        this.needy.set(entry.room.id, state);
        continue;
      }

      if (now - state.needySince < LOBBY_FILL.waitBeforeInviteMs) continue;
      if (state.lastWaveAt > 0 && now - state.lastWaveAt < LOBBY_FILL.waveCooldownMs) {
        continue;
      }

      const limit = invitesForWave(seats);
      if (limit <= 0) continue;

      await this.inviteWave(entry.room.code, entry.room.id, seats, state, limit, now);
      // Always cool down after an attempt so empty warm pools do not hammer every sweep.
      state.lastWaveAt = now;
    }

    for (const roomId of [...this.needy.keys()]) {
      if (!liveIds.has(roomId)) this.needy.delete(roomId);
    }
  }

  private async inviteWave(
    roomCode: string,
    roomId: string,
    seats: number,
    state: NeedyRoomState,
    limit: number,
    nowMs: number,
  ): Promise<void> {
    const exclude = this.busyUserKeys();
    for (const userKey of state.invited) exclude.add(userKey);

    let sent = 0;
    let failed = 0;
    let candidates = 0;
    let stop: WaveStopReason = 'no_candidates';

    for (const runtime of this.runtimes()) {
      const kind = messengerKindOf(runtime);
      const remaining = limit - sent;
      if (remaining <= 0) {
        stop = 'done';
        break;
      }

      const targets = await this.product.listWarmInviteTargets({
        platform: kind,
        now: new Date(nowMs),
        warmWindowMs: LOBBY_FILL.warmWindowMs,
        postGameCooldownMs: LOBBY_FILL.postGameCooldownMs,
        inviteCooldownMs: LOBBY_FILL.inviteCooldownMs,
        excludeUserKeys: exclude,
        limit: remaining,
      });
      candidates += targets.length;

      for (const userKey of targets) {
        const live = this.repo.get(roomId);
        if (!live || live.room.phase !== Phase.Lobby) {
          stop = 'lobby_gone';
          await this.recordWave(roomCode, seats, limit, candidates, sent, failed, stop, nowMs);
          return;
        }
        if (live.room.players.length >= 5) {
          stop = 'table_full';
          await this.recordWave(roomCode, seats, limit, candidates, sent, failed, stop, nowMs);
          return;
        }

        const result = await this.sendInvite(runtime, kind, userKey, roomCode, seats, nowMs);
        exclude.add(userKey);
        state.invited.add(userKey);
        if (result === 'sent') sent += 1;
        else failed += 1;
        if (this.sendDelayMs > 0) await sleep(this.sendDelayMs);
      }
    }

    if (sent >= limit) stop = 'done';
    else if (candidates === 0) stop = 'no_candidates';
    else if (sent + failed > 0) stop = 'done';

    await this.recordWave(roomCode, seats, limit, candidates, sent, failed, stop, nowMs);
  }

  private async recordWave(
    roomCode: string,
    seats: number,
    limit: number,
    candidates: number,
    invited: number,
    failed: number,
    stop: WaveStopReason,
    nowMs: number,
  ): Promise<void> {
    await this.product.recordEvent({
      name: 'lobby_fill_wave',
      at: new Date(nowMs),
      roomCode,
      payload: { seats, limit, candidates, invited, failed, stop },
    });
  }

  private busyUserKeys(): Set<string> {
    const busy = new Set<string>();
    for (const entry of this.repo.listEntries()) {
      for (const player of entry.room.players) {
        if (player.joinKey) busy.add(player.joinKey);
      }
    }
    for (const joinKey of this.sockets.queuedJoinKeys()) busy.add(joinKey);
    return busy;
  }

  private runtimes(): BaleRuntime[] {
    return [this.bale, this.telegram].filter((runtime): runtime is BaleRuntime => runtime != null);
  }

  private async sendInvite(
    runtime: BaleRuntime,
    kind: MessengerKind,
    userKey: string,
    roomCode: string,
    seats: number,
    nowMs: number,
  ): Promise<'sent' | 'failed'> {
    const prefix = `${kind}:`;
    if (!userKey.startsWith(prefix)) {
      await this.recordFail(kind, userKey, roomCode, seats, 'bad_user_key', nowMs);
      return 'failed';
    }
    const chatId = userKey.slice(prefix.length);
    const numericChatId = Number(chatId);
    if (!Number.isFinite(numericChatId)) {
      await this.recordFail(kind, userKey, roomCode, seats, 'bad_user_key', nowMs);
      return 'failed';
    }

    const reply = lobbyFillInviteReply({
      seats,
      code: roomCode,
      botUsername: runtime.botUsername,
      startLink: startLinkFor(runtime),
      platform: kind,
    });

    try {
      await runtime.bot.sendMessage({
        chat_id: numericChatId,
        text: reply.text,
        reply_markup: reply.reply_markup,
      });
    } catch (error) {
      const reason = classifyMessengerFailure(error);
      if (reason === 'blocked') {
        await this.subscribers?.remove(kind, chatId);
      }
      await this.recordFail(kind, userKey, roomCode, seats, reason, nowMs, errorMessage(error));
      return 'failed';
    }

    await this.product.recordEvent({
      name: 'lobby_fill_invite',
      at: new Date(nowMs),
      platform: kind,
      userKey,
      roomCode,
      payload: { seats },
    });
    return 'sent';
  }

  private async recordFail(
    platform: MessengerKind,
    userKey: string,
    roomCode: string,
    seats: number,
    reason: FillFailReason,
    nowMs: number,
    detail?: string,
  ): Promise<void> {
    await this.product.recordEvent({
      name: 'lobby_fill_fail',
      at: new Date(nowMs),
      platform,
      userKey,
      roomCode,
      payload: detail ? { seats, reason, detail: detail.slice(0, 200) } : { seats, reason },
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function classifyMessengerFailure(error: unknown): FillFailReason {
  if (!(error instanceof Error)) return 'other';
  const errorCode =
    'errorCode' in error && typeof (error as { errorCode: unknown }).errorCode === 'number'
      ? (error as { errorCode: number }).errorCode
      : null;
  const description = (
    ('description' in error && typeof (error as { description: unknown }).description === 'string'
      ? (error as { description: string }).description
      : error.message) ?? ''
  ).toLowerCase();
  if (errorCode === 429 || description.includes('too many requests')) return 'rate_limit';
  if (
    description.includes('blocked') ||
    description.includes("can't initiate") ||
    description.includes('cannot initiate')
  ) {
    return 'blocked';
  }
  return 'other';
}
