import { describe, expect, it } from '@rstest/core';
import { Phase, PlayerFactory, RoomFactory } from '@secret-hitler/shared';
import {
  isInProgressLiveGame,
  needsReconnectGrace,
  shouldKeepEmptyRoom,
  shouldPersistLiveRoom,
} from './liveRoomPolicy';

function hostedLobby() {
  return RoomFactory.create({ name: 'Friday Night' });
}

function publicLobby() {
  return RoomFactory.create({ name: 'Untitled', kind: 'public' });
}

function occupy(room: ReturnType<typeof hostedLobby>) {
  room.players.push(PlayerFactory.create('Ana', 0, true));
  return room;
}

describe('liveRoomPolicy', () => {
  it('Should persist occupied lobbies, the empty public salon, and in-progress matches', () => {
    const hosted = hostedLobby();
    expect(shouldPersistLiveRoom(hosted)).toBe(false);

    occupy(hosted);
    expect(shouldPersistLiveRoom(hosted)).toBe(true);

    const pub = publicLobby();
    expect(shouldPersistLiveRoom(pub)).toBe(true);

    hosted.phase = Phase.Nomination;
    expect(isInProgressLiveGame(hosted)).toBe(true);
    expect(shouldPersistLiveRoom(hosted)).toBe(true);

    hosted.phase = Phase.GameOver;
    expect(shouldPersistLiveRoom(hosted)).toBe(false);
  });

  it('Should keep an empty public salon and restored occupied tables under grace', () => {
    const pub = publicLobby();
    expect(shouldKeepEmptyRoom(pub, false)).toBe(true);

    const hosted = occupy(hostedLobby());
    expect(needsReconnectGrace(hosted)).toBe(true);
    expect(shouldKeepEmptyRoom(hosted, true)).toBe(true);
    expect(shouldKeepEmptyRoom(hosted, false)).toBe(false);

    hosted.phase = Phase.Nomination;
    expect(shouldKeepEmptyRoom(hosted, true)).toBe(true);
    expect(shouldKeepEmptyRoom(hosted, false)).toBe(false);
  });
});
