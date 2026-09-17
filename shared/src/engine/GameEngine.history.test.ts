import { describe, expect, it } from '@rstest/core';
import { Phase } from '../types/GameState';
import {
  StackedDeck,
  electGovernment,
  flushBreath,
  skipOpeningNight,
  startGame,
} from '../../test/test-utils';

describe('GameEngine — round history', () => {
  it('Should record president, chancellor, ballots, and abstentions as Nein', () => {
    const { engine, room, players } = startGame();
    const [ana, ben, cal] = players;
    skipOpeningNight(room);
    engine.endDiscussion();

    engine.handleCommand(ana.id, {
      kind: 'nominateChancellor',
      targetId: ben.id,
    });
    engine.handleCommand(ana.id, { kind: 'castVote', vote: 'ja' });
    // Ben and Cal never vote — both count as Nein when the window closes.
    engine.resolveVoteTimeout();
    flushBreath(engine);

    expect(room.phase).toBe(Phase.Nomination);
    expect(room.roundHistory).toHaveLength(1);
    const entry = room.roundHistory[0]!;
    expect(entry.round).toBe(1);
    expect(entry.presidentId).toBe(ana.id);
    expect(entry.chancellorId).toBe(ben.id);
    expect(entry.elected).toBe(false);
    expect(entry.ja).toBe(1);
    expect(entry.nein).toBe(2);
    const calBallot = entry.ballots?.find((ballot) => ballot.playerId === cal.id);
    expect(calBallot).toEqual({
      playerId: cal.id,
      name: cal.name,
      vote: 'nein',
      abstained: true,
    });
  });

  it('Should record an enacted law on a passed government', () => {
    const deck = new StackedDeck(['liberal', 'fascist', 'fascist']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);
    const [president, chancellor] = game.players;
    electGovernment(game, chancellor);

    game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: 1 });
    game.engine.handleCommand(chancellor.id, { kind: 'enactPolicy', index: 0 });
    flushBreath(game.engine);

    expect(game.room.roundHistory).toHaveLength(1);
    const entry = game.room.roundHistory[0]!;
    expect(entry.elected).toBe(true);
    expect(entry.enacted).toBe('liberal');
    expect(entry.presidentName).toBe(president.name);
    expect(entry.chancellorName).toBe(chancellor.name);
  });

  it('Should mark a nomination timeout as nominationFailed', () => {
    const { engine, room, players } = startGame();
    skipOpeningNight(room);
    engine.endDiscussion();
    engine.resolveNominationTimeout();
    flushBreath(engine);

    expect(room.roundHistory).toHaveLength(1);
    const entry = room.roundHistory[0]!;
    expect(entry.presidentId).toBe(players[0].id);
    expect(entry.chancellorId).toBeNull();
    expect(entry.nominationFailed).toBe(true);
    expect(entry.ballots).toBeNull();
  });

  it('Should expose finished rounds on the viewer snapshot', () => {
    const { engine, room, players } = startGame();
    skipOpeningNight(room);
    engine.endDiscussion();
    engine.resolveNominationTimeout();
    flushBreath(engine);

    const view = room.viewFor(players[0].id);
    expect(view.roundHistory).toHaveLength(1);
    expect(view.roundHistory[0]?.round).toBe(1);
  });
});
