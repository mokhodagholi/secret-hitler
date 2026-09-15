import { createSignal } from 'solid-js';
import {
  CHAT_SLOWMODE_MS,
  MessageRouter,
  Phase,
  type ChatMessage,
  type CreateRoomRequest,
  type CreateRoomResponse,
  type GameCommand,
  type GameStateView,
  type JoinRoomRequest,
  type JoinRoomResponse,
  type LogEntry,
  type ProfileResponse,
  type PublicPlayer,
  type Role,
  type RoomClosedReason,
  type RoomSummary,
  type SaveProfileRequest,
  type ServerErrorCode,
  type ServerMessage,
} from '@secret-hitler/shared';
import type { WebSocketService } from './WebSocketService';

/** Error surfaced by the HTTP room endpoints, mapped to translatable codes. */
export class RoomApiError extends Error {
  constructor(
    readonly code: ServerErrorCode | 'NETWORK',
    message: string,
  ) {
    super(message);
    this.name = 'RoomApiError';
  }
}

export interface RoomSession {
  roomId: string;
  code: string;
  token: string;
  playerId: string;
  shareLink?: string;
}

export interface ServerError {
  code: ServerErrorCode;
  message: string;
}

const SESSION_KEY = 'sh:session';
const MAX_CHAT_ENTRIES = 200;
const ERROR_TOAST_MS = 3_500;

/**
 * Client-side mirror of the authoritative server state. Exposes the latest
 * per-viewer {@link GameStateView} (plus role, chat and log) as Solid signals,
 * and wraps the room HTTP endpoints + WebSocket actions behind typed methods.
 *
 * The session token is kept in localStorage so closing the mini-app still
 * offers a way back to a live seat. sessionStorage is read once for older tabs.
 */
export class GameStateService {
  private readonly viewSignal = createSignal<GameStateView | null>(null);
  readonly view = this.viewSignal[0];
  private readonly setView = this.viewSignal[1];

  private readonly roleSignal = createSignal<Role | null>(null);
  readonly role = this.roleSignal[0];
  private readonly setRole = this.roleSignal[1];

  private readonly chatSignal = createSignal<ChatMessage[]>([]);
  readonly chatMessages = this.chatSignal[0];
  private readonly setChatMessages = this.chatSignal[1];

  private readonly logSignal = createSignal<LogEntry[]>([]);
  readonly logEntries = this.logSignal[0];
  private readonly setLogEntries = this.logSignal[1];

  // Chat arriving while the docked panel is collapsed, so the chrome can badge.
  private readonly unreadSignal = createSignal(0);
  readonly unreadChat = this.unreadSignal[0];
  private readonly setUnreadChat = this.unreadSignal[1];

  private readonly lastErrorSignal = createSignal<ServerError | null>(null);
  readonly lastError = this.lastErrorSignal[0];
  private readonly setLastError = this.lastErrorSignal[1];
  private errorClearTimer: ReturnType<typeof setTimeout> | null = null;

  /** Epoch ms when this seat may send another table-chat line. */
  private readonly chatSlowUntilSignal = createSignal(0);
  readonly chatSlowUntil = this.chatSlowUntilSignal[0];
  private readonly setChatSlowUntil = this.chatSlowUntilSignal[1];

  /** Set when the server destroys the room (e.g. the host left). */
  private readonly roomClosedSignal = createSignal<RoomClosedReason | null>(null);
  readonly roomClosedNotice = this.roomClosedSignal[0];
  private readonly setRoomClosedNotice = this.roomClosedSignal[1];

  // Reactive so lobby/table screens can bounce when the seat is dropped.
  private readonly sessionSignal = createSignal<RoomSession | null>(null);
  private readonly session = this.sessionSignal[0];
  private readonly setSession = this.sessionSignal[1];

  constructor(private readonly socket: WebSocketService) {
    const router = this.buildRouter();
    socket.onMessage((message) => router.dispatch(message, undefined));
    this.restoreSession();
  }

  // --- Derived helpers -----------------------------------------------------

  /** The viewer's own public player record, if seated. */
  you(): PublicPlayer | null {
    const state = this.view();
    if (!state) return null;
    return state.players.find((player) => player.id === state.you.id) ?? null;
  }

  isHost(): boolean {
    const state = this.view();
    return state != null && state.hostId === state.you.id;
  }

  /** The open discussion window, if discussion is running. */
  discussionDeadline(): GameStateView['discussionDeadline'] {
    return this.view()?.discussionDeadline ?? null;
  }

  /** Open discussion window (everyone may chat) before nomination opens. */
  inDiscussion(): boolean {
    const state = this.view();
    return state?.phase === Phase.Nomination && state.discussionDeadline != null;
  }

  /** Clear the unread chat badge — the player can see the docked feed. */
  markChatRead(): void {
    this.setUnreadChat(0);
  }

  /** Client mirror of the server's start conditions (server re-checks). */
  canStart(): boolean {
    const state = this.view();
    if (!state || state.phase !== Phase.Lobby) return false;
    const connected = state.players.filter((player) => player.connected);
    return (
      connected.length >= state.minPlayers &&
      connected.every((player) => player.ready)
    );
  }

  /** Reactive — true while this client holds a seat in a room. */
  inRoom(): boolean {
    return this.session() != null;
  }

  currentSession(): RoomSession | null {
    return this.session();
  }

  clearError(): void {
    this.clearErrorTimer();
    this.setLastError(null);
  }

  clearRoomClosedNotice(): void {
    this.setRoomClosedNotice(null);
  }

  // --- HTTP ----------------------------------------------------------------

  async createRoom(request: CreateRoomRequest): Promise<RoomSession> {
    const response = await this.request<CreateRoomResponse>('POST', '/api/rooms', request);
    return this.beginSession({ ...response, shareLink: response.shareLink });
  }

  async joinRoom(idOrCode: string, request: JoinRoomRequest): Promise<RoomSession> {
    const response = await this.request<JoinRoomResponse>(
      'POST',
      `/api/rooms/${encodeURIComponent(idOrCode)}/join`,
      request,
    );
    return this.beginSession(response);
  }

  async claimPlaySeat(
    code: string,
    seat: number,
    initData: string | undefined,
  ): Promise<RoomSession> {
    const response = await this.request<JoinRoomResponse>('POST', '/api/play-game', {
      code,
      seat,
      initData,
    });
    return this.beginSession(response);
  }

  async listRooms(): Promise<RoomSummary[]> {
    let response: Response;
    try {
      response = await fetch('/api/rooms');
    } catch {
      throw new RoomApiError('NETWORK', 'Could not reach the server.');
    }
    if (!response.ok) {
      throw new RoomApiError('NETWORK', 'Could not load the room list.');
    }
    return (await response.json()) as RoomSummary[];
  }

  /** Persist the chosen card. Local settings already hold it if this fails. */
  async saveProfile(request: SaveProfileRequest): Promise<void> {
    try {
      await this.request<ProfileResponse>('PUT', '/api/profile', request);
    } catch {
      /* local settings already hold the card */
    }
  }

  async loadProfile(clientId: string): Promise<number | null> {
    let response: Response;
    try {
      response = await fetch(
        `/api/profile?clientId=${encodeURIComponent(clientId)}`,
      );
    } catch {
      return null;
    }
    if (!response.ok) return null;
    const body = (await response.json().catch(() => ({}))) as ProfileResponse;
    return typeof body.avatar === 'number' ? body.avatar : null;
  }

  // --- WebSocket actions ---------------------------------------------------

  setReady(ready: boolean): void {
    this.socket.send({ type: ready ? 'player:ready' : 'player:unready' });
  }

  kickPlayer(playerId: string): void {
    this.socket.send({ type: 'player:kick', playerId });
  }

  requestKick(playerId: string): void {
    this.socket.send({ type: 'kick:request', playerId });
  }

  voteKick(agree: boolean): void {
    this.socket.send({ type: 'kick:vote', agree });
  }

  startGame(): void {
    this.socket.send({ type: 'game:start' });
  }

  continuePlaying(): void {
    this.socket.send({ type: 'game:continue' });
  }

  setWantStart(want: boolean): void {
    this.socket.send({ type: want ? 'player:wantStart' : 'player:retractStart' });
  }

  sendChat(text: string): void {
    const body = text.trim();
    if (!body) return;
    if (Date.now() < this.chatSlowUntil()) return;
    this.socket.send({ type: 'chat:message', text: body });
    this.setChatSlowUntil(Date.now() + CHAT_SLOWMODE_MS);
  }

  sendCommand(command: GameCommand): void {
    this.socket.send({ type: 'command', command });
  }

  /** Tell the server we're leaving, then drop the session and reset state. */
  leaveRoom(): void {
    this.socket.send({ type: 'room:leave' });
    this.socket.disconnect();
    this.setSession(null);
    clearStoredSession();
    this.setView(null);
    this.setRole(null);
    this.setChatMessages([]);
    this.setLogEntries([]);
    this.setUnreadChat(0);
    this.setLastError(null);
    this.clearErrorTimer();
    this.setChatSlowUntil(0);
  }

  // --- Internals -----------------------------------------------------------

  private beginSession(session: RoomSession): RoomSession {
    const previous = this.session();
    // Find Game while a live seat is still open must leave that table first —
    // otherwise the leftover in-game snapshot yanks the player back into it.
    if (previous && previous.roomId !== session.roomId) {
      this.socket.send({ type: 'room:leave' });
      this.socket.disconnect();
    }
    this.setSession(session);
    writeStoredSession(session);
    this.setView(null);
    this.setRole(null);
    this.setChatMessages([]);
    this.setLogEntries([]);
    this.setUnreadChat(0);
    this.setLastError(null);
    this.clearErrorTimer();
    this.setChatSlowUntil(0);
    this.socket.connect(session.token);
    return session;
  }

  private restoreSession(): void {
    const restored = readStoredSession();
    if (!restored) return;
    this.setSession(restored);
    this.socket.connect(restored.token);
  }

  private buildRouter(): MessageRouter<ServerMessage> {
    return new MessageRouter<ServerMessage>()
      .on('state', (message) => {
        this.setView(message.state);
        if (message.state.you.role) this.setRole(message.state.you.role);
      })
      .on('private', (message) => this.setRole(message.role))
      .on('chat', (message) => {
        this.setChatMessages((messages) =>
          [...messages, message.message].slice(-MAX_CHAT_ENTRIES),
        );
        // Don't badge a player for their own message — only others' chat.
        if (message.message.playerId !== this.view()?.you.id) {
          this.setUnreadChat((count) => count + 1);
        }
      })
      .on('log', (message) =>
        this.setLogEntries((entries) =>
          [...entries, message.entry].slice(-MAX_CHAT_ENTRIES),
        ),
      )
      .on('room:closed', (message) => {
        // Host can catch its own broadcast; only kicked players still hold a session.
        if (this.session()) {
          this.setRoomClosedNotice(message.reason);
          this.leaveRoom();
        }
      })
      .on('error', (message) => {
        if (message.code === 'AUTH_FAILED') {
          this.leaveRoom();
        } else {
          this.setLastError({ code: message.code, message: message.message });
          this.armErrorClear();
        }
      });
  }

  private armErrorClear(): void {
    this.clearErrorTimer();
    this.errorClearTimer = setTimeout(() => {
      this.errorClearTimer = null;
      this.setLastError(null);
    }, ERROR_TOAST_MS);
  }

  private clearErrorTimer(): void {
    if (this.errorClearTimer == null) return;
    clearTimeout(this.errorClearTimer);
    this.errorClearTimer = null;
  }

  private async request<T>(
    method: 'POST' | 'PUT',
    url: string,
    body: unknown,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new RoomApiError('NETWORK', 'Could not reach the server.');
    }

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      code?: ServerErrorCode;
    };
    if (!response.ok) {
      throw new RoomApiError(
        payload.code ?? 'NETWORK',
        payload.error ?? 'Request failed.',
      );
    }
    return payload as T;
  }
}

function readStoredSession(): RoomSession | null {
  const fromLocal = parseSession(localStorage.getItem(SESSION_KEY));
  if (fromLocal) return fromLocal;
  const fromTab = parseSession(sessionStorage.getItem(SESSION_KEY));
  if (!fromTab) return null;
  writeStoredSession(fromTab);
  return fromTab;
}

function writeStoredSession(session: RoomSession): void {
  const raw = JSON.stringify(session);
  localStorage.setItem(SESSION_KEY, raw);
  sessionStorage.removeItem(SESSION_KEY);
}

function clearStoredSession(): void {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

function parseSession(raw: string | null): RoomSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RoomSession>;
    if (
      typeof value.roomId !== 'string' ||
      typeof value.code !== 'string' ||
      typeof value.token !== 'string' ||
      typeof value.playerId !== 'string'
    ) {
      return null;
    }
    return {
      roomId: value.roomId,
      code: value.code,
      token: value.token,
      playerId: value.playerId,
      shareLink: typeof value.shareLink === 'string' ? value.shareLink : undefined,
    };
  } catch {
    return null;
  }
}
