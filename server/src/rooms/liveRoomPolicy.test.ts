import { describe, expect, it } from '@rstest/core';
import { Phase, RoomFactory } from '@secret-hitler/shared';
import {
  isInProgressLiveGame,
  shouldKeepEmptyRoom,
  shouldPersistLiveRoom,
} from './liveRoomPolicy';

function hostedLobby() {
  return RoomFactory.create({ name: 'Friday Night' });
}

function publicLobby() {
  return RoomFactory.create({ name: 'Untitled', kind: 'public' });
}

describe('liveRoomPolicy', () => {
  it('Should persist only a public lobby and an in-progress match', () => {
    const hosted = hostedLobby();
    expect(shouldPersistLiveRoom(hosted)).toBe(false);

    const pub = publicLobby();
    expect(shouldPersistLiveRoom(pub)).toBe(true);

    hosted.phase = Phase.Nomination;
    expect(isInProgressLiveGame(hosted)).toBe(true);
    expect(shouldPersistLiveRoom(hosted)).toBe(true);

    hosted.phase = Phase.GameOver;
    expect(shouldPersistLiveRoom(hosted)).toBe(false);
  });

  it('Should keep an empty public lobby and an in-progress match under grace', () => {
    const pub = publicLobby();
    expect(shouldKeepEmptyRoom(pub, false)).toBe(true);

    const hosted = hostedLobby();
    expect(shouldKeepEmptyRoom(hosted, true)).toBe(false);

    hosted.phase = Phase.Voting;
    expect(shouldKeepEmptyRoom(hosted, false)).toBe(false);
    expect(shouldKeepEmptyRoom(hosted, true)).toBe(true);

    pub.phase = Phase.Nomination;
    expect(shouldKeepEmptyRoom(pub, false)).toBe(false);
    expect(shouldKeepEmptyRoom(pub, true)).toBe(true);
  });
});
