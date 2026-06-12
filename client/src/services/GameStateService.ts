import { createSignal, type Accessor, type Setter } from 'solid-js';
import {
  MIN_PLAYERS,
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
  readonly view: Accessor<GameStateView | null>;
  readonly role: Accessor<Role | null>;
  readonly chatMessages: Accessor<ChatMessage[]>;
  readonly logEntries: Accessor<LogEntry[]>;
  readonly lastError: Accessor<ServerError | null>;
  /** Set when the server destroys the room (e.g. the host left). */
  readonly roomClosedNotice: Accessor<RoomClosedReason | null>;

  private readonly setView: Setter<GameStateView | null>;
  private readonly setRole: Setter<Role | null>;
  private readonly setChatMessages: Setter<ChatMessage[]>;
  private readonly setLogEntries: Setter<LogEntry[]>;
  private readonly setLastError: Setter<ServerError | null>;
  private readonly setRoomClosedNotice: Setter<RoomClosedReason | null>;

  private session: RoomSession | null = null;

  constructor(private readonly socket: WebSocketService) {
    const [view, setView] = createSignal<GameStateView | null>(null);
    const [role, setRole] = createSignal<Role | null>(null);
    const [chatMessages, setChatMessages] = createSignal<ChatMessage[]>([]);
    const [logEntries, setLogEntries] = createSignal<LogEntry[]>([]);
    const [lastError, setLastError] = createSignal<ServerError | null>(null);
    const [roomClosedNotice, setRoomClosedNotice] =
      createSignal<RoomClosedReason | null>(null);
    this.view = view;
    this.setView = setView;
    this.role = role;
    this.setRole = setRole;
    this.chatMessages = chatMessages;
    this.setChatMessages = setChatMessages;
    this.logEntries = logEntries;
    this.setLogEntries = setLogEntries;
    this.lastError = lastError;
    this.setLastError = setLastError;
    this.roomClosedNotice = roomClosedNotice;
    this.setRoomClosedNotice = setRoomClosedNotice;

    socket.onMessage((message) => this.onServerMessage(message));
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

  /** Client-side mirror of the server's start conditions (server re-checks). */
  canStart(): boolean {
    const state = this.view();
    if (!state || state.phase !== Phase.Lobby) return false;
    const connected = state.players.filter((player) => player.connected);
    return (
      connected.length >= MIN_PLAYERS && connected.every((player) => player.ready)
    );
  }

  inRoom(): boolean {
    return this.session != null;
  }

  currentSession(): RoomSession | null {
    return this.session;
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
    this.session = null;
    sessionStorage.removeItem(SESSION_KEY);
    this.setView(null);
    this.setRole(null);
    this.setChatMessages([]);
    this.setLogEntries([]);
    this.setLastError(null);
  }

  // --- Internals -----------------------------------------------------------

  private beginSession(session: RoomSession): RoomSession {
    this.session = session;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.setChatMessages([]);
    this.setLogEntries([]);
    this.setLastError(null);
    this.socket.connect(session.token);
    return session;
  }

  private restoreSession(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      this.session = JSON.parse(raw) as RoomSession;
      this.socket.connect(this.session.token);
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  private onServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'state':
        this.setView(message.state);
        if (message.state.you.role) this.setRole(message.state.you.role);
        break;
      case 'private':
        this.setRole(message.role);
        break;
      case 'chat':
        this.setChatMessages((messages) =>
          [...messages, message.message].slice(-MAX_CHAT_ENTRIES),
        );
        break;
      case 'log':
        this.setLogEntries((entries) =>
          [...entries, message.entry].slice(-MAX_CHAT_ENTRIES),
        );
        break;
      case 'room:closed':
        // The leaving host may catch its own broadcast — only players still
        // holding a session were actually kicked.
        if (this.session) {
          this.setRoomClosedNotice(message.reason);
          this.leaveRoom();
        }
        break;
      case 'error':
        if (message.code === 'AUTH_FAILED') {
          // Token expired (e.g. server restarted) — the seat is gone.
          this.leaveRoom();
        } else {
          this.setLastError({ code: message.code, message: message.message });
        }
        break;
    }
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
