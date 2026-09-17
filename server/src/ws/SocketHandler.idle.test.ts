import { afterEach, describe, expect, it } from '@rstest/core';
import { DEFAULT_FLAGS, LOBBY_DISCONNECT_MS, Phase, WS_IDLE_MS } from '@secret-hitler/shared';
import { RoomRepository } from '../rooms/RoomRepository';
import { TokenStore } from '../rooms/TokenStore';
import { SocketHandler } from './SocketHandler';

/** Minimal stand-in for `ws` — only what the idle sweep and close path need. */
class FakeSocket {
  readyState = 1;
  readonly OPEN = 1;
  autoPong = false;
  pingCalls = 0;
  private readonly listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  on(event: string, listener: (...args: unknown[]) => void): void {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }

  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }

  ping(): void {
    this.pingCalls += 1;
    if (this.autoPong) this.emit('pong');
  }

  terminate(): void {
    this.readyState = 3;
    this.emit('close');
  }

  close(): void {
    this.terminate();
  }

  send(): void {}
}

describe('SocketHandler — idle sockets', () => {
  let handler: SocketHandler | undefined;
  let clock = 1_000_000;

  afterEach(() => {
    handler?.dispose();
    handler = undefined;
    clock = 1_000_000;
  });

  function sitGuest(): {
    entry: ReturnType<RoomRepository['create']>;
    guestId: string;
    hostId: string;
    ws: FakeSocket;
  } {
    const repo = new RoomRepository(3);
    const tokens = new TokenStore();
    handler = new SocketHandler(
      repo,
      tokens,
      null,
      null,
      null,
      DEFAULT_FLAGS,
      null,
      null,
      () => clock,
      WS_IDLE_MS,
    );

    const entry = repo.create({ name: 'Bunker' });
    handler.registerEngine(entry);
    const host = entry.engine.addPlayer('Ana', true);
    const guest = entry.engine.addPlayer('Ben');
    if (!('id' in host) || !('id' in guest)) throw new Error('expected seats');

    const token = tokens.issue({ roomId: entry.room.id, playerId: guest.id });
    const ws = new FakeSocket();
    handler.handleConnection(ws as never);
    ws.emit('message', JSON.stringify({ type: 'auth', token }));
    return { entry, guestId: guest.id, hostId: host.id, ws };
  }

  it('Should mark a lobby seat disconnected when the socket goes idle', () => {
    const { entry, guestId, hostId } = sitGuest();
    expect(entry.room.findPlayer(guestId)?.connected).toBe(true);

    clock += WS_IDLE_MS + 1;
    handler!.sweepIdleSockets();

    const seat = entry.room.findPlayer(guestId);
    expect(seat?.connected).toBe(false);
    expect(entry.room.phase).toBe(Phase.Lobby);

    // Engine timestamps use wall clock; force the disconnect grace elapsed.
    seat!.unreadySince = Date.now() - LOBBY_DISCONNECT_MS;
    entry.engine.resolveLobbyAfkTimeout(guestId);
    expect(entry.room.findPlayer(guestId)).toBeUndefined();
    expect(entry.room.findPlayer(hostId)).toBeTruthy();
  });

  it('Should keep a seat when the browser answers protocol pings', () => {
    const { entry, guestId, ws } = sitGuest();
    ws.autoPong = true;

    clock += WS_IDLE_MS / 2;
    handler!.sweepIdleSockets();
    clock += WS_IDLE_MS / 2;
    handler!.sweepIdleSockets();

    expect(ws.pingCalls).toBe(2);
    expect(entry.room.findPlayer(guestId)?.connected).toBe(true);
  });
});
