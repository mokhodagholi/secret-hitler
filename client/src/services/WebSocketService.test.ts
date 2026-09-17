import { afterEach, describe, expect, it } from '@rstest/core';
import { AUTH_REJECTED_CLOSE_CODE, WebSocketService } from './WebSocketService';
import { DEFAULT_FLAGS } from '@secret-hitler/shared';

const OriginalWebSocket = globalThis.WebSocket;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readonly sent: string[] = [];
  readyState = FakeWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code = 1000): void {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code } as CloseEvent);
  }

  completeOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  receive(data: object): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }
}

function lastSocket(): FakeWebSocket {
  const socket = FakeWebSocket.instances.at(-1);
  if (!socket) throw new Error('expected a WebSocket to have been opened');
  return socket;
}

afterEach(() => {
  globalThis.WebSocket = OriginalWebSocket;
  FakeWebSocket.instances = [];
});

function connectAuthed(): { service: WebSocketService; socket: FakeWebSocket } {
  globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  const service = new WebSocketService();
  service.connect('seat-token');
  const socket = lastSocket();
  socket.completeOpen();
  socket.receive({ type: 'authed', playerId: 'p1', flags: DEFAULT_FLAGS });
  return { service, socket };
}

describe('WebSocketService', () => {
  it('Should authenticate on open', () => {
    const { service, socket } = connectAuthed();
    expect(service.status()).toBe('connected');
    expect(JSON.parse(socket.sent[0]!)).toEqual({ type: 'auth', token: 'seat-token' });
    service.disconnect();
  });

  it('Should keep the new socket when the previous one is dropped', () => {
    const { service, socket: first } = connectAuthed();
    service.connect('seat-token');
    const second = lastSocket();
    second.completeOpen();
    second.receive({ type: 'authed', playerId: 'p1', flags: DEFAULT_FLAGS });

    expect(first.onclose).toBeNull();
    first.close(AUTH_REJECTED_CLOSE_CODE);
    expect(service.status()).toBe('connected');
    service.disconnect();
  });

  it('Should stop reconnecting when the live socket is auth-rejected', () => {
    const { service, socket } = connectAuthed();
    socket.close(AUTH_REJECTED_CLOSE_CODE);
    expect(service.status()).toBe('disconnected');
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('Should ping when the tab becomes visible', () => {
    const { service, socket } = connectAuthed();
    socket.sent.length = 0;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(JSON.parse(socket.sent[0]!)).toEqual({ type: 'ping' });
    service.disconnect();
  });
});
