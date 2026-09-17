import { describe, expect, it } from '@rstest/core';
import {
  BREATH_AFTER_FAIL_MS,
  BREATH_AFTER_LAW_MS,
  BREATH_AFTER_VOTE_MS,
  LEGISLATIVE_DEAL_MS,
  Phase,
} from '../types/GameState';
import {
  StackedDeck,
  electGovernment,
  flushBreath,
  releaseChoiceHolds,
  skipOpeningNight,
  startGame,
} from '../../test/test-utils';

describe('GameEngine — announce breath', () => {
  it('Should delay the legislative choice clock after a passed vote', () => {
    const deck = new StackedDeck(['liberal', 'fascist', 'fascist']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck, { skipCeremony: false });
    const before = Date.now();
    electGovernment(game, game.players[1]);

    expect(game.room.phase).toBe(Phase.PresidentLegislative);
    expect(game.room.legislativeStartedAt - before).toBeGreaterThanOrEqual(
      BREATH_AFTER_VOTE_MS + LEGISLATIVE_DEAL_MS - 50,
    );
  });

  it('Should hold after a failed vote before the next discussion', () => {
    const { engine, room, players } = startGame(undefined, undefined, {
      skipCeremony: false,
    });
    skipOpeningNight(room);
    engine.endDiscussion();
    releaseChoiceHolds(room);
    engine.handleCommand(players[0].id, {
      kind: 'nominateChancellor',
      targetId: players[1].id,
    });
    releaseChoiceHolds(room);
    engine.handleCommand(players[0].id, { kind: 'castVote', vote: 'nein' });
    engine.handleCommand(players[1].id, { kind: 'castVote', vote: 'nein' });
    engine.handleCommand(players[2].id, { kind: 'castVote', vote: 'nein' });

    expect(room.pendingBreath).not.toBeNull();
    expect(room.pendingBreath!.endsAt - room.pendingBreath!.startedAt).toBe(
      BREATH_AFTER_FAIL_MS,
    );
    expect(room.phase).toBe(Phase.Voting);

    flushBreath(engine);
    expect(room.phase).toBe(Phase.Nomination);
    expect(room.pendingBreath).toBeNull();
  });

  it('Should hold after a law before opening the next round', () => {
    const deck = new StackedDeck(['liberal', 'fascist', 'fascist']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck, { skipCeremony: false });
    const [president, chancellor] = game.players;
    electGovernment(game, chancellor);
    releaseChoiceHolds(game.room);
    game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: 1 });
    releaseChoiceHolds(game.room);
    game.engine.handleCommand(chancellor.id, { kind: 'enactPolicy', index: 0 });

    expect(game.room.pendingBreath).not.toBeNull();
    expect(game.room.pendingBreath!.action.kind).toBe('advanceRound');
    expect(
      game.room.pendingBreath!.endsAt - game.room.pendingBreath!.startedAt,
    ).toBe(BREATH_AFTER_LAW_MS);
    expect(game.room.phase).toBe(Phase.ChancellorLegislative);

    flushBreath(game.engine);
    expect(game.room.phase).toBe(Phase.Nomination);
  });

  it('Should refuse commands during an announce breath', () => {
    const { engine, room, players } = startGame(undefined, undefined, {
      skipCeremony: false,
    });
    skipOpeningNight(room);
    engine.endDiscussion();
    engine.resolveNominationTimeout();
    expect(room.pendingBreath).not.toBeNull();

    const error = engine.handleCommand(players[0].id, {
      kind: 'nominateChancellor',
      targetId: players[1].id,
    });
    expect(error?.code).toBe('INVALID_ACTION');
  });
});
