import { describe, expect, it } from '@rstest/core';
import { Phase, type RoomSummary } from '@secret-hitler/shared';
import { pickFullerLobby } from './lobbyNudge';

function lobby(overrides: Partial<RoomSummary> = {}): RoomSummary {
  return {
    id: 'room-a',
    code: 'AAAAAA',
    name: 'A',
    playerCount: 2,
    maxPlayers: 10,
    hasPassword: false,
    phase: Phase.Lobby,
    ...overrides,
  };
}

describe('pickFullerLobby', () => {
  it('Should pick the unlocked lobby with the most seats', () => {
    expect(
      pickFullerLobby({
        rooms: [
          lobby({ id: 'thin', playerCount: 2 }),
          lobby({ id: 'fuller', playerCount: 4 }),
          lobby({ id: 'mid', playerCount: 3 }),
        ],
        currentRoomId: 'thin',
        currentCount: 2,
      })?.id,
    ).toBe('fuller');
  });

  it('Should still offer a move from a five-seat lobby', () => {
    expect(
      pickFullerLobby({
        rooms: [lobby({ id: 'fuller', playerCount: 8 })],
        currentRoomId: 'here',
        currentCount: 5,
      })?.id,
    ).toBe('fuller');
  });

  it('Should stay put once this table has six people', () => {
    expect(
      pickFullerLobby({
        rooms: [lobby({ id: 'fuller', playerCount: 8 })],
        currentRoomId: 'here',
        currentCount: 6,
      }),
    ).toBeNull();
  });

  it('Should stay put when no other lobby has more people', () => {
    expect(
      pickFullerLobby({
        rooms: [
          lobby({ id: 'here', playerCount: 3 }),
          lobby({ id: 'same', playerCount: 3 }),
          lobby({ id: 'thin', playerCount: 1 }),
        ],
        currentRoomId: 'here',
        currentCount: 3,
      }),
    ).toBeNull();
  });

  it('Should skip locked, full, and in-progress tables', () => {
    expect(
      pickFullerLobby({
        rooms: [
          lobby({ id: 'locked', playerCount: 6, hasPassword: true }),
          lobby({ id: 'packed', playerCount: 10, maxPlayers: 10 }),
          lobby({
            id: 'playing',
            playerCount: 8,
            phase: Phase.Nomination,
          }),
          lobby({ id: 'open', playerCount: 4 }),
        ],
        currentRoomId: 'here',
        currentCount: 1,
      })?.id,
    ).toBe('open');
  });
});
