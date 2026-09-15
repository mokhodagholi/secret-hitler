import { describe, expect, it } from '@rstest/core';
import { Phase, type Role } from '../../types/GameState';
import { StackedDeck, electGovernment, startGame } from '../../../test/test-utils';
import type { RunningGame } from '../../../test/test-utils';

const FIVE = ['Ana', 'Ben', 'Cal', 'Dan', 'Eve'];

/** Assign deterministic roles: seat 0 fascist, last seat Hitler, rest liberal. */
function setRoles(game: RunningGame): void {
  game.players.forEach((player, index) => {
    const role: Role =
      index === 0 ? 'fascist' : index === game.players.length - 1 ? 'hitler' : 'liberal';
    player.role = role;
  });
}

/** Elect a government and enact the top (fascist) policy to trigger a power. */
function enactFascist(game: RunningGame, priorFascist: number): void {
  game.room.fascistPolicies = priorFascist;
  const chancellor = game.players[1];
  electGovernment(game, chancellor);
  game.engine.handleCommand(game.room.presidentId!, {
    kind: 'discardPolicy',
    index: 1,
  });
  game.engine.handleCommand(chancellor.id, { kind: 'enactPolicy', index: 0 });
}

describe('SpecialPowerPhase', () => {
  it('Should enter Policy Peek on the 3rd fascist policy (5–6 players)', () => {
    // Three for the legislative draw, three more for the peek to reveal.
    const deck = new StackedDeck([
      'fascist',
      'liberal',
      'liberal',
      'liberal',
      'fascist',
      'liberal',
    ]);
    const game = startGame(FIVE, deck);
    setRoles(game);
    enactFascist(game, 2);

    expect(game.room.phase).toBe(Phase.SpecialPower);
    expect(game.room.activePower).toBe('policyPeek');
    expect(game.room.viewFor(game.room.presidentId!).you.peek.length).toBe(3);

    // Acknowledging advances to the next round.
    game.engine.handleCommand(game.room.presidentId!, {
      kind: 'useSpecialPower',
      targetId: '',
    });
    expect(game.room.phase).toBe(Phase.Nomination);
  });

  it('Should grant Execution on the 4th fascist policy and end on Hitler', () => {
    const game = startGame(FIVE, new StackedDeck(['fascist', 'liberal', 'liberal']));
    setRoles(game);
    enactFascist(game, 3);

    expect(game.room.activePower).toBe('execution');
    const hitler = game.players.find((p) => p.role === 'hitler')!;
    game.engine.handleCommand(game.room.presidentId!, {
      kind: 'useSpecialPower',
      targetId: hitler.id,
    });

    expect(hitler.isAlive).toBe(false);
    expect(game.room.phase).toBe(Phase.GameOver);
    expect(game.room.winner).toBe('liberal');
  });

  it('Should continue the game when a non-Hitler is executed', () => {
    const game = startGame(FIVE, new StackedDeck(['fascist', 'liberal', 'liberal']));
    setRoles(game);
    enactFascist(game, 3);

    const liberal = game.players.find(
      (p) => p.role === 'liberal' && p.id !== game.room.presidentId,
    )!;
    game.engine.handleCommand(game.room.presidentId!, {
      kind: 'useSpecialPower',
      targetId: liberal.id,
    });

    expect(liberal.isAlive).toBe(false);
    expect(game.room.phase).toBe(Phase.Nomination);
  });
});

describe('SpecialPowerPhase — 7-player powers', () => {
  const SEVEN = ['Ana', 'Ben', 'Cal', 'Dan', 'Eve', 'Fay', 'Gil'];

  it('Should investigate a target once, revealing only the party', () => {
    const game = startGame(SEVEN, new StackedDeck(['fascist', 'liberal', 'liberal']));
    setRoles(game);
    enactFascist(game, 1); // 2nd fascist policy → Investigate in 7–8 player games

    expect(game.room.activePower).toBe('investigate');
    const investigatorId = game.room.presidentId!;
    const target = game.players.find((p) => p.role === 'hitler')!;
    game.engine.handleCommand(investigatorId, {
      kind: 'useSpecialPower',
      targetId: target.id,
    });

    const result = game.room.viewFor(investigatorId).you.investigation;
    expect(result).toEqual({ name: target.name, party: 'fascist' });
    expect(
      game.room.viewFor(investigatorId).players.find((p) => p.id === target.id)
        ?.party,
    ).toBe('fascist');
    expect(
      game.room.viewFor(target.id).players.find((p) => p.id === target.id)?.party,
    ).toBeNull();
    expect(game.room.specialPowerEndsAt).toBeGreaterThan(Date.now());
    expect(game.room.specialPowerEndsAt - game.room.specialPowerStartedAt).toBe(
      10_000,
    );

    // A second investigate of the same player is rejected before acknowledging.
    const repeat = game.engine.handleCommand(investigatorId, {
      kind: 'useSpecialPower',
      targetId: target.id,
    });
    // Acknowledging the result advances the round.
    expect(repeat).toBeNull();
    expect(game.room.phase).toBe(Phase.Nomination);
    expect(
      game.room.viewFor(investigatorId).players.find((p) => p.id === target.id)
        ?.party,
    ).toBe('fascist');
  });

  it('Should open a 15-second choose window when Investigate begins', () => {
    const game = startGame(SEVEN, new StackedDeck(['fascist', 'liberal', 'liberal']));
    setRoles(game);
    enactFascist(game, 1);

    expect(game.room.phase).toBe(Phase.SpecialPower);
    expect(game.room.specialPowerEndsAt - game.room.specialPowerStartedAt).toBe(
      15_000,
    );
  });

  it('Should advance after the investigate reveal hold times out', () => {
    const game = startGame(SEVEN, new StackedDeck(['fascist', 'liberal', 'liberal']));
    setRoles(game);
    enactFascist(game, 1);

    const investigatorId = game.room.presidentId!;
    const target = game.players.find((p) => p.role === 'hitler')!;
    game.engine.handleCommand(investigatorId, {
      kind: 'useSpecialPower',
      targetId: target.id,
    });
    expect(game.room.investigation).not.toBeNull();

    game.engine.resolveSpecialPowerTimeout();
    expect(game.room.phase).toBe(Phase.Nomination);
  });

  it('Should hand the presidency to the special-election pick', () => {
    const game = startGame(SEVEN, new StackedDeck(['fascist', 'liberal', 'liberal']));
    setRoles(game);
    enactFascist(game, 2); // 3rd fascist policy → Special Election in 7–8 games

    expect(game.room.activePower).toBe('specialElection');
    const pick = game.players[4];
    game.engine.handleCommand(game.room.presidentId!, {
      kind: 'useSpecialPower',
      targetId: pick.id,
    });

    expect(game.room.phase).toBe(Phase.Nomination);
    expect(game.room.presidentId).toBe(pick.id);
  });
});
