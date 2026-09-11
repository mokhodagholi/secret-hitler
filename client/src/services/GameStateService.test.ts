import { describe, expect, it } from '@rstest/core';
import { GameStateService } from './GameStateService';
import { FakeSocket } from '../../test/test-utils';
import type { WebSocketService } from './WebSocketService';

const SESSION = {
  roomId: 'room-1',
  code: 'ABC123',
  token: 'token-1',
  playerId: 'you',
};

describe('GameStateService — seat persistence', () => {
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
});
