import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { CHAT_SLOWMODE_MS, Phase } from '@secret-hitler/shared';
import { GameStateService } from './GameStateService';
import { FakeSocket, makeView } from '../../test/test-utils';
import type { WebSocketService } from './WebSocketService';

const SESSION = {
  roomId: 'room-1',
  code: 'ABC123',
  token: 'token-1',
  playerId: 'you',
};

describe('GameStateService — seat persistence', () => {
  afterEach(() => {
    rs.restoreAllMocks();
  });
  it('Should keep a live seat in localStorage so a later visit can return', () => {
    localStorage.setItem('sh:session', JSON.stringify(SESSION));
    const socket = new FakeSocket();
    const game = new GameStateService(socket as unknown as WebSocketService);

    expect(game.inRoom()).toBe(true);
    expect(game.currentSession()).toEqual(SESSION);
  });

  it('Should lift a tab-only seat into localStorage', () => {
    sessionStorage.setItem('sh:session', JSON.stringify(SESSION));
    const socket = new FakeSocket();
    const game = new GameStateService(socket as unknown as WebSocketService);

    expect(game.inRoom()).toBe(true);
    expect(localStorage.getItem('sh:session')).toBe(JSON.stringify(SESSION));
    expect(sessionStorage.getItem('sh:session')).toBeNull();
  });

  it('Should forget the seat when the player leaves', () => {
    localStorage.setItem('sh:session', JSON.stringify(SESSION));
    const socket = new FakeSocket();
    const game = new GameStateService(socket as unknown as WebSocketService);

    game.leaveRoom();

    expect(game.inRoom()).toBe(false);
    expect(localStorage.getItem('sh:session')).toBeNull();
    expect(sessionStorage.getItem('sh:session')).toBeNull();
  });

  it('Should leave the previous table and drop its snapshot when joining another room', async () => {
    localStorage.setItem('sh:session', JSON.stringify(SESSION));
    const socket = new FakeSocket();
    const game = new GameStateService(socket as unknown as WebSocketService);
    socket.emit({
      type: 'state',
      state: makeView({ phase: Phase.Nomination }),
    });
    expect(game.view()?.phase).toBe(Phase.Nomination);

    rs.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          roomId: 'room-2',
          code: 'XYZ789',
          token: 'token-2',
          playerId: 'you-2',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await game.joinRoom('room-2', { name: 'Ana' });

    expect(socket.lastSent('room:leave')).toEqual({ type: 'room:leave' });
    expect(game.view()).toBeNull();
    expect(game.currentSession()).toEqual({
      roomId: 'room-2',
      code: 'XYZ789',
      token: 'token-2',
      playerId: 'you-2',
    });
  });

  it('Should keep the same-room seat when the join is a return to that table', async () => {
    localStorage.setItem('sh:session', JSON.stringify(SESSION));
    const socket = new FakeSocket();
    const game = new GameStateService(socket as unknown as WebSocketService);

    rs.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          roomId: SESSION.roomId,
          code: SESSION.code,
          token: 'token-rejoin',
          playerId: SESSION.playerId,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await game.joinRoom(SESSION.roomId, { name: 'Ana' });

    expect(socket.lastSent('room:leave')).toBeUndefined();
    expect(game.currentSession()?.token).toBe('token-rejoin');
  });
});

describe('GameStateService — table chat', () => {
  afterEach(() => {
    rs.restoreAllMocks();
  });

  it('Should refuse a second chat line until the pause elapses', () => {
    let now = 1_000;
    rs.spyOn(Date, 'now').mockImplementation(() => now);
    const socket = new FakeSocket();
    const game = new GameStateService(socket as unknown as WebSocketService);

    game.sendChat('first');
    game.sendChat('too soon');
    expect(
      socket.sent.filter((message) => message.type === 'chat:message'),
    ).toHaveLength(1);

    now += CHAT_SLOWMODE_MS;
    game.sendChat('later');
    expect(
      socket.sent.filter((message) => message.type === 'chat:message'),
    ).toHaveLength(2);
  });
});
