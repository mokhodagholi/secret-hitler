import { createSignal, type Accessor, type Setter } from 'solid-js';
import type { ClientMessage, ServerMessage } from '@secret-hitler/shared';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

type MessageListener = (message: ServerMessage) => void;

const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 8000;
/** Keep the proxied socket alive; Node 18+ otherwise 408s idle upgrades. */
const HEARTBEAT_INTERVAL_MS = 25_000;
/** Server close code for a rejected token — retrying it is futile. */
export const AUTH_REJECTED_CLOSE_CODE = 4001;

/**
 * Owns the WebSocket connection to the game server: opens `/ws`, performs the
 * auth handshake, dispatches typed {@link ServerMessage}s to listeners, and
 * reconnects with exponential backoff while a session is active.
 *
 * Game semantics live in GameStateService — this class only moves messages.
 */
export class WebSocketService {
  readonly status: Accessor<ConnectionStatus>;
  private readonly setStatus: Setter<ConnectionStatus>;

  private socket: WebSocket | null = null;
  private token: string | null = null;
  private listeners = new Set<MessageListener>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const [status, setStatus] = createSignal<ConnectionStatus>('disconnected');
    this.status = status;
    this.setStatus = setStatus;
  }

  /** Subscribe to every server message. Returns an unsubscribe function. */
  onMessage(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Open the socket and authenticate with the given join token. */
  connect(token: string): void {
    this.token = token;
    this.reconnectAttempts = 0;
    this.open();
  }

  /** Close the socket and stop reconnecting (e.g. on leave room). */
  disconnect(): void {
    this.token = null;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.dropSocket(this.socket);
    this.socket = null;
    this.setStatus('disconnected');
  }

  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private open(): void {
    if (!this.token) return;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.dropSocket(this.socket);
    this.setStatus('connecting');

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${location.host}/ws`);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket || !this.token) return;
      socket.send(JSON.stringify({ type: 'auth', token: this.token }));
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      let message: ServerMessage;
      try {
        message = JSON.parse(String(event.data)) as ServerMessage;
      } catch {
        return;
      }
      if (message.type === 'authed') {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.startHeartbeat();
      }
      for (const listener of this.listeners) listener(message);
    };

    socket.onclose = (event) => {
      // A replaced socket must not clear the live one (reconnect / second tab).
      if (this.socket !== socket) return;
      this.stopHeartbeat();
      this.socket = null;
      this.setStatus('disconnected');
      if (event.code === AUTH_REJECTED_CLOSE_CODE) {
        this.token = null;
        return;
      }
      this.scheduleReconnect();
    };

    socket.onerror = () => socket.close();
  }

  private dropSocket(socket: WebSocket | null): void {
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.token || this.reconnectTimer) return;
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
