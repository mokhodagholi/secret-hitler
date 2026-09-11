import { describe, expect, it } from '@rstest/core';
import { Room } from './Room';
import { startGame } from '../../test/test-utils';

describe('Room snapshot', () => {
  it('Should round-trip board, votes, and the deck through JSON', () => {
    const { room, players } = startGame();
    room.liberalPolicies = 2;
    room.fascistPolicies = 3;
    room.votes.set(players[0].id, 'ja');
    room.votes.set(players[1].id, 'nein');
    room.drawnPolicies = ['liberal', 'fascist'];
    room.kickVote = {
      requesterId: players[0].id,
      targetId: players[1].id,
      votes: new Map([[players[0].id, true]]),
      startedAt: 10,
      endsAt: 40,
      needed: 2,
    };
    room.spentKickRequestIds.add(players[0].id);
    const peek = room.deck.peekTop(3);
    room.peekedPolicies = peek;

    const restored = Room.fromSnapshot(
      JSON.parse(JSON.stringify(room.toSnapshot())),
    );

    expect(restored.id).toBe(room.id);
    expect(restored.code).toBe(room.code);
    expect(restored.phase).toBe(room.phase);
    expect(restored.liberalPolicies).toBe(2);
    expect(restored.fascistPolicies).toBe(3);
    expect(restored.players.map((player) => player.id)).toEqual(
      room.players.map((player) => player.id),
    );
    expect(restored.votes.get(players[0].id)).toBe('ja');
    expect(restored.votes.get(players[1].id)).toBe('nein');
    expect(restored.drawnPolicies).toEqual(['liberal', 'fascist']);
    expect(restored.kickVote?.targetId).toBe(players[1].id);
    expect(restored.kickVote?.votes.get(players[0].id)).toBe(true);
    expect(restored.kickVote?.needed).toBe(2);
    expect([...restored.spentKickRequestIds]).toEqual([players[0].id]);
    expect(restored.peekedPolicies).toEqual(peek);
    expect(restored.deck.drawCount).toBe(room.deck.drawCount);
    expect(restored.deck.discardCount).toBe(room.deck.discardCount);
    expect(restored.deck.drawTiles(3)).toEqual(peek);
  });

  it('Should treat a missing spent-kick list as empty', () => {
    const { room } = startGame();
    const snapshot = room.toSnapshot();
    delete snapshot.spentKickRequestIds;
    const restored = Room.fromSnapshot(
      JSON.parse(JSON.stringify(snapshot)),
    );
    expect(restored.spentKickRequestIds.size).toBe(0);
  });
});
