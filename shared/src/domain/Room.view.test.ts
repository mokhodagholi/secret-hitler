import { describe, expect, it } from '@rstest/core';
import { Phase } from '../types/GameState';
import { StackedDeck, electGovernment, startGame } from '../../test/test-utils';

describe('Room.viewFor — information hiding', () => {
  it('Should hide other players\' roles while the game is running', () => {
    const { room, players } = startGame();
    for (const player of room.players) player.role = 'liberal';
    players[1].role = 'hitler';

    const view = room.viewFor(players[0].id);
    const others = view.players.filter((p) => p.id !== players[0].id);
    expect(others.every((p) => p.role === null)).toBe(true);
    expect(view.you.role).toBe('liberal');
  });

  it('Should let fascists see each other and Hitler', () => {
    const { room, players } = startGame(['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    const [ana, ben, cal, dia, eli] = players;
    ana.role = 'fascist';
    ben.role = 'hitler';
    cal.role = 'liberal';
    dia.role = 'liberal';
    eli.role = 'liberal';

    const fascistView = room.viewFor(ana.id);
    const seen = new Map(fascistView.players.map((p) => [p.id, p.role]));
    expect(seen.get(ben.id)).toBe('hitler');
    expect(seen.get(cal.id)).toBeNull();

    const liberalView = room.viewFor(cal.id);
    const seenByLiberal = new Map(liberalView.players.map((p) => [p.id, p.role]));
    expect(seenByLiberal.get(ana.id)).toBeNull();
    expect(seenByLiberal.get(ben.id)).toBeNull();
  });

  it('Should reveal every role once the game is over', () => {
    const { engine, room, players } = startGame();
    for (const player of room.players) player.role = 'liberal';
    engine.endGame();

    const view = room.viewFor(players[0].id);
    expect(view.players.every((p) => p.role === 'liberal')).toBe(true);
  });

  it('Should expose who voted but never what they voted', () => {
    const game = startGame();
    const { engine, room, players } = game;
    const [president, ben] = players;
    engine.handleCommand(president.id, {
      kind: 'nominateChancellor',
      targetId: ben.id,
    });
    engine.handleCommand(ben.id, { kind: 'castVote', vote: 'nein' });

    const view = room.viewFor(president.id);
    const benPublic = view.players.find((p) => p.id === ben.id)!;
    expect(benPublic.hasVoted).toBe(true);
    expect(JSON.stringify(view)).not.toContain('nein');
    expect(view.you.vote).toBeNull();
  });

  it('Should only show the legislative hand to the active legislator', () => {
    const deck = new StackedDeck(['liberal', 'fascist', 'fascist']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);
    const [president, chancellor, bystander] = game.players;
    electGovernment(game, chancellor);

    expect(game.room.viewFor(president.id).you.policies).toHaveLength(3);
    expect(game.room.viewFor(chancellor.id).you.policies).toHaveLength(0);
    expect(game.room.viewFor(bystander.id).you.policies).toHaveLength(0);

    game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: 0 });
    expect(game.room.viewFor(president.id).you.policies).toHaveLength(0);
    expect(game.room.viewFor(chancellor.id).you.policies).toHaveLength(2);
  });

  it('Should not let a liberal see any other role mid-game', () => {
    const { room, players } = startGame(['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    const [ana, ben, cal, dia, eli] = players;
    ana.role = 'liberal';
    ben.role = 'fascist';
    cal.role = 'hitler';
    dia.role = 'liberal';
    eli.role = 'liberal';

    const view = room.viewFor(ana.id);
    const others = view.players.filter((p) => p.id !== ana.id);
    expect(others.every((p) => p.role === null)).toBe(true);
  });

  it('Should not let Hitler see the fascists in a 7+ player game', () => {
    const { room, players } = startGame([
      'Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay', 'Gus',
    ]);
    const [hitler, fascist] = players;
    hitler.role = 'hitler';
    fascist.role = 'fascist';
    players.slice(2).forEach((p) => (p.role = 'liberal'));

    const view = room.viewFor(hitler.id);
    const seen = view.players.find((p) => p.id === fascist.id)!;
    expect(seen.role).toBeNull();
  });

  it('Should show an investigated party only to the President who checked', () => {
    const game = startGame(['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay', 'Gus']);
    const { room, players } = game;
    const [president, ...rest] = players;
    president.role = 'liberal';
    rest.forEach((player, index) => {
      player.role = index === rest.length - 1 ? 'hitler' : 'liberal';
    });
    room.investigations = [
      { investigatorId: president.id, targetId: rest[0].id, party: 'liberal' },
    ];

    const presidentView = room.viewFor(president.id);
    expect(presidentView.players.find((p) => p.id === rest[0].id)?.party).toBe(
      'liberal',
    );
    expect(presidentView.players.find((p) => p.id === rest[1].id)?.party).toBeNull();

    const bystander = room.viewFor(rest[1].id);
    expect(bystander.players.find((p) => p.id === rest[0].id)?.party).toBeNull();
    expect(bystander.players.find((p) => p.id === rest[0].id)?.role).toBeNull();
  });

  it('Should count only lobby rooms as joinable in the public summary', () => {
    const { room } = startGame();
    expect(room.summary().phase).toBe(Phase.Nomination);
    expect(room.summary().playerCount).toBe(3);
  });
});
