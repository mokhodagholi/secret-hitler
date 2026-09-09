import { createSignal } from 'solid-js';
import {
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
  type PublicPlayer,
  type Role,
  type RoomClosedReason,
  type RoomSummary,
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

/**
 * Client-side mirror of the authoritative server state. Exposes the latest
 * per-viewer {@link GameStateView} (plus role, chat and log) as Solid signals,
 * and wraps the room HTTP endpoints + WebSocket actions behind typed methods.
 *
 * The session token is kept in sessionStorage so a page refresh silently
 * reconnects to the same seat.
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

  // Chat messages arriving while the player is away from the chat page, so the
  // game screen can badge the chat icon.
  private readonly unreadSignal = createSignal(0);
  readonly unreadChat = this.unreadSignal[0];
  private readonly setUnreadChat = this.unreadSignal[1];

  private readonly lastErrorSignal = createSignal<ServerError | null>(null);
  readonly lastError = this.lastErrorSignal[0];
  private readonly setLastError = this.lastErrorSignal[1];

  /** Set when the server destroys the room (e.g. the host left). */
  private readonly roomClosedSignal = createSignal<RoomClosedReason | null>(null);
  readonly roomClosedNotice = this.roomClosedSignal[0];
  private readonly setRoomClosedNotice = this.roomClosedSignal[1];

  // A signal so screens can react to entering/leaving a room (e.g. the play
  // flow redirects back into the active room instead of seating a new player).
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

  /** Clear the unread chat badge — the player is looking at the chat page. */
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
    this.setLastError(null);
  }

  clearRoomClosedNotice(): void {
    this.setRoomClosedNotice(null);
  }

  // --- HTTP ----------------------------------------------------------------

  async createRoom(request: CreateRoomRequest): Promise<RoomSession> {
    const response = await this.post<CreateRoomResponse>('/api/rooms', request);
    return this.beginSession({ ...response, shareLink: response.shareLink });
  }

  async joinRoom(idOrCode: string, request: JoinRoomRequest): Promise<RoomSession> {
    const response = await this.post<JoinRoomResponse>(
      `/api/rooms/${encodeURIComponent(idOrCode)}/join`,
      request,
    );
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

  // --- WebSocket actions ---------------------------------------------------

  setReady(ready: boolean): void {
    this.socket.send({ type: ready ? 'player:ready' : 'player:unready' });
  }

  kickPlayer(playerId: string): void {
    this.socket.send({ type: 'player:kick', playerId });
  }

  startGame(): void {
    this.socket.send({ type: 'game:start' });
  }

  sendChat(text: string): void {
    const body = text.trim();
    if (body) this.socket.send({ type: 'chat:message', text: body });
  }

  sendCommand(command: GameCommand): void {
    this.socket.send({ type: 'command', command });
  }

  /** Tell the server we're leaving, then drop the session and reset state. */
  leaveRoom(): void {
    this.socket.send({ type: 'room:leave' });
    this.socket.disconnect();
    this.setSession(null);
    sessionStorage.removeItem(SESSION_KEY);
    this.setView(null);
    this.setRole(null);
    this.setChatMessages([]);
    this.setLogEntries([]);
    this.setUnreadChat(0);
    this.setLastError(null);
  }

  // --- Internals -----------------------------------------------------------

  private beginSession(session: RoomSession): RoomSession {
    this.setSession(session);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.setChatMessages([]);
    this.setLogEntries([]);
    this.setUnreadChat(0);
    this.setLastError(null);
    this.socket.connect(session.token);
    return session;
  }

  private restoreSession(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const restored = JSON.parse(raw) as RoomSession;
      this.setSession(restored);
      this.socket.connect(restored.token);
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
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
        }
      });
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
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
