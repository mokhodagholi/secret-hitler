import { describe, expect, it } from '@rstest/core';
import { Phase } from '../types/GameState';
import { StackedDeck, electGovernment, makeRoom, startGame } from '../../test/test-utils';
import { GameEngine } from '../engine/GameEngine';
import { seatPlayers } from '../../test/test-utils';

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

  it('Should reveal roles to everyone when the room opts into showRoles', () => {
    const room = makeRoom({ showRoles: true });
    const engine = new GameEngine(room);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    players.forEach((p) => engine.setReady(p.id, true));
    engine.startGame(players[0].id);

    const view = room.viewFor(players[0].id);
    expect(view.players.every((p) => p.role != null)).toBe(true);
  });

  it('Should count only lobby rooms as joinable in the public summary', () => {
    const { room } = startGame();
    expect(room.summary().phase).toBe(Phase.Nomination);
    expect(room.summary().playerCount).toBe(3);
  });
});
