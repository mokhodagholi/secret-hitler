import { describe, expect, it } from '@rstest/core';
import { GameEngine } from './GameEngine';
import { Phase } from '../types/GameState';
import {
  StackedDeck,
  electGovernment,
  makeRoom,
  seatPlayers,
  startGame,
} from '../../test/test-utils';

describe('GameEngine — lobby', () => {
  it('Should make the first player the host and mark them ready', () => {
    const engine = new GameEngine(makeRoom());
    const [host, guest] = seatPlayers(engine, ['Ana', 'Ben']);
    expect(host.isHost).toBe(true);
    expect(host.ready).toBe(true);
    expect(engine.room.hostId).toBe(host.id);
    expect(guest.isHost).toBe(false);
  });

  it('Should keep guests unready until they opt in', () => {
    const engine = new GameEngine(makeRoom());
    const [, guest] = seatPlayers(engine, ['Ana', 'Ben']);
    expect(guest.ready).toBe(false);
    engine.setReady(guest.id, true);
    expect(guest.ready).toBe(true);
    engine.setReady(guest.id, false);
    expect(guest.ready).toBe(false);
  });

  it('Should reject players once the room is full', () => {
    const engine = new GameEngine(makeRoom({ maxPlayers: 3 }));
    seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    const rejected = engine.addPlayer('Dan');
    expect(rejected).toMatchObject({ code: 'ROOM_FULL' });
  });

  it('Should reject players after the game has started', () => {
    const { engine } = startGame();
    const rejected = engine.addPlayer('Late');
    expect(rejected).toMatchObject({ code: 'ALREADY_STARTED' });
  });

  it('Should refuse to start when the requester is not the host', () => {
    const engine = new GameEngine(makeRoom());
    const [, guest] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.startGame(guest.id)).toMatchObject({ code: 'NOT_HOST' });
  });

  it('Should refuse to start below the minimum player count', () => {
    const engine = new GameEngine(makeRoom({ minPlayers: 5 }));
    const [host] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.startGame(host.id)).toMatchObject({ code: 'NOT_ENOUGH_PLAYERS' });
  });

  it('Should refuse to start while any connected player is unready', () => {
    const engine = new GameEngine(makeRoom());
    const [host, ben, cal] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    engine.setReady(ben.id, true);
    expect(engine.startGame(host.id)).toMatchObject({ code: 'PLAYERS_NOT_READY' });
    expect(engine.canStart()).toBe(false);

    engine.setReady(cal.id, true);
    expect(engine.canStart()).toBe(true);
    expect(engine.startGame(host.id)).toBeNull();
    expect(engine.room.phase).toBe(Phase.Nomination);
  });

  it('Should refuse to start a game twice', () => {
    const { engine, players } = startGame();
    expect(engine.startGame(players[0].id)).toMatchObject({
      code: 'ALREADY_STARTED',
    });
  });

  it('Should deal everyone a role and exactly one Hitler on start', () => {
    const { room } = startGame(['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    const roles = room.players.map((player) => player.role);
    expect(roles.every((role) => role != null)).toBe(true);
    expect(roles.filter((role) => role === 'hitler')).toHaveLength(1);
    expect(roles.filter((role) => role === 'fascist')).toHaveLength(1);
    expect(roles.filter((role) => role === 'liberal')).toHaveLength(3);
  });

  it('Should announce each assigned role through a private event', () => {
    const engine = new GameEngine(makeRoom());
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    players.forEach((player) => engine.setReady(player.id, true));
    const announced: string[] = [];
    engine.on('roleAssigned', ({ playerId }) => announced.push(playerId));

    engine.startGame(players[0].id);
    expect(announced.sort()).toEqual(players.map((p) => p.id).sort());
  });

  it('Should drop disconnected lobby players when the game starts', () => {
    const engine = new GameEngine(makeRoom());
    const [host, ben, cal, dan] = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dan']);
    [host, ben, cal, dan].forEach((p) => engine.setReady(p.id, true));
    engine.setConnected(dan.id, false);

    expect(engine.startGame(host.id)).toBeNull();
    expect(engine.room.players).toHaveLength(3);
    expect(engine.room.players.map((p) => p.seat)).toEqual([0, 1, 2]);
    expect(engine.room.findPlayer(dan.id)).toBeUndefined();
  });

  it('Should reseat the remaining players when someone leaves the lobby', () => {
    const engine = new GameEngine(makeRoom());
    const [, ben, cal] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    engine.removePlayer(ben.id);
    expect(engine.room.players.map((p) => p.name)).toEqual(['Ana', 'Cal']);
    expect(cal.seat).toBe(1);
  });

  it('Should let the host kick a guest from the lobby', () => {
    const engine = new GameEngine(makeRoom());
    const [host, ben] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.kickPlayer(host.id, ben.id)).toBeNull();
    expect(engine.room.findPlayer(ben.id)).toBeUndefined();
    expect(engine.room.players.map((p) => p.name)).toEqual(['Ana', 'Cal']);
  });

  it('Should refuse a kick from anyone but the host', () => {
    const engine = new GameEngine(makeRoom());
    const [, ben, cal] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.kickPlayer(ben.id, cal.id)).toMatchObject({ code: 'NOT_HOST' });
    expect(engine.room.findPlayer(cal.id)).toBeTruthy();
  });

  it('Should migrate the host to a connected player after the grace call', () => {
    const engine = new GameEngine(makeRoom());
    const [host, ben] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    engine.setConnected(host.id, false);
    // Host seat survives the disconnect itself…
    expect(engine.room.hostId).toBe(host.id);

    // …until the server's grace period expires.
    engine.migrateHostIfDisconnected();
    expect(engine.room.hostId).toBe(ben.id);
    expect(ben.isHost).toBe(true);
    expect(ben.ready).toBe(true);
    expect(host.isHost).toBe(false);
  });

  it('Should not migrate the host while they are still connected', () => {
    const engine = new GameEngine(makeRoom());
    const [host] = seatPlayers(engine, ['Ana', 'Ben']);
    engine.migrateHostIfDisconnected();
    expect(engine.room.hostId).toBe(host.id);
  });
});

describe('GameEngine — nomination and voting', () => {
  it('Should move to voting when the President nominates a living player', () => {
    const { engine, room, players } = startGame();
    const [president, ben] = players;
    const error = engine.handleCommand(president.id, {
      kind: 'nominateChancellor',
      targetId: ben.id,
    });
    expect(error).toBeNull();
    expect(room.phase).toBe(Phase.Voting);
    expect(room.chancellorId).toBe(ben.id);
  });

  it('Should reject a nomination from anyone but the President', () => {
    const { engine, players } = startGame();
    const [, ben, cal] = players;
    const error = engine.handleCommand(ben.id, {
      kind: 'nominateChancellor',
      targetId: cal.id,
    });
    expect(error).toMatchObject({ code: 'INVALID_ACTION' });
  });

  it('Should reject the President nominating themselves', () => {
    const { engine, players } = startGame();
    const [president] = players;
    const error = engine.handleCommand(president.id, {
      kind: 'nominateChancellor',
      targetId: president.id,
    });
    expect(error).toMatchObject({ code: 'INVALID_ACTION' });
  });

  it('Should reject a vote while no election is running', () => {
    const { engine, players } = startGame();
    const error = engine.handleCommand(players[0].id, {
      kind: 'castVote',
      vote: 'ja',
    });
    expect(error).toMatchObject({ code: 'INVALID_ACTION' });
  });

  it('Should elect the government on a strict Ja majority', () => {
    const { engine, room, players } = startGame();
    const [president, ben, cal] = players;
    engine.handleCommand(president.id, {
      kind: 'nominateChancellor',
      targetId: ben.id,
    });
    engine.handleCommand(president.id, { kind: 'castVote', vote: 'ja' });
    engine.handleCommand(ben.id, { kind: 'castVote', vote: 'ja' });
    engine.handleCommand(cal.id, { kind: 'castVote', vote: 'nein' });

    expect(room.phase).toBe(Phase.PresidentLegislative);
    expect(room.electionTracker).toBe(0);
  });

  it('Should fail a tied election and advance the tracker and presidency', () => {
    const { engine, room, players } = startGame(['Ana', 'Ben', 'Cal', 'Dia']);
    const [president, ben, cal, dia] = players;
    engine.handleCommand(president.id, {
      kind: 'nominateChancellor',
      targetId: ben.id,
    });
    engine.handleCommand(president.id, { kind: 'castVote', vote: 'ja' });
    engine.handleCommand(ben.id, { kind: 'castVote', vote: 'ja' });
    engine.handleCommand(cal.id, { kind: 'castVote', vote: 'nein' });
    engine.handleCommand(dia.id, { kind: 'castVote', vote: 'nein' });

    expect(room.electionTracker).toBe(1);
    expect(room.phase).toBe(Phase.Nomination);
    expect(room.presidentId).toBe(ben.id);
  });

  it('Should resolve the election when the last unvoted player disconnects', () => {
    const { engine, room, players } = startGame();
    const [president, ben, cal] = players;
    engine.handleCommand(president.id, {
      kind: 'nominateChancellor',
      targetId: ben.id,
    });
    engine.handleCommand(president.id, { kind: 'castVote', vote: 'ja' });
    engine.handleCommand(ben.id, { kind: 'castVote', vote: 'ja' });
    expect(room.phase).toBe(Phase.Voting);

    // Cal never votes — their disconnect must not stall the game forever.
    engine.setConnected(cal.id, false);
    expect(room.phase).toBe(Phase.PresidentLegislative);
  });

  it('Should enact the top policy automatically after three failed elections', () => {
    const deck = new StackedDeck(['fascist', 'liberal', 'liberal']);
    const { engine, room, players } = startGame(['Ana', 'Ben', 'Cal'], deck);

    for (let round = 0; round < 3; round++) {
      const president = room.findPlayer(room.presidentId ?? '')!;
      const target = players.find((p) => p.id !== president.id)!;
      engine.handleCommand(president.id, {
        kind: 'nominateChancellor',
        targetId: target.id,
      });
      for (const player of players) {
        engine.handleCommand(player.id, { kind: 'castVote', vote: 'nein' });
      }
    }

    expect(room.fascistPolicies).toBe(1);
    expect(room.electionTracker).toBe(0);
    expect(room.lastEnacted).toEqual(['fascist']);
  });

  it('Should hand the Fascists victory when Hitler takes the chancellorship after three fascist policies', () => {
    const { engine, room, players } = startGame();
    const [, ben] = players;
    room.fascistPolicies = 3;
    for (const player of room.players) player.role = 'liberal';
    ben.role = 'hitler';

    let gameOverSeen = false;
    engine.on('gameOver', () => (gameOverSeen = true));
    electGovernment({ engine, room, players }, ben);

    expect(room.phase).toBe(Phase.GameOver);
    expect(gameOverSeen).toBe(true);
  });

  it('Should open each round with a discussion window before nomination', () => {
    const { room } = startGame();
    expect(room.discussionEndsAt).toBeGreaterThan(Date.now());
    expect(room.nominationEndsAt).toBe(0);
  });

  it('Should keep discussion open when a player disconnects', () => {
    const { engine, room, players } = startGame();
    const [president] = players;
    engine.setConnected(president.id, false);
    expect(room.discussionEndsAt).toBeGreaterThan(0);
  });

  it('Should keep playing after a disconnect until the next round', () => {
    const { engine, room, players } = startGame([
      'Ana',
      'Ben',
      'Cal',
      'Dia',
      'Eli',
    ]);
    const presidentId = room.presidentId;
    const liberal = players.find(
      (player) => player.role === 'liberal' && player.id !== presidentId,
    )!;
    engine.setConnected(liberal.id, false);
    expect(room.winner).toBeNull();
    expect(room.phase).toBe(Phase.Nomination);
  });

  it('Should hand the Fascists victory next round when leavers tie the table', () => {
    const { engine, room, players } = startGame([
      'Ana',
      'Ben',
      'Cal',
      'Dia',
      'Eli',
    ]);
    const presidentId = room.presidentId!;
    const liberal = players.find(
      (player) => player.role === 'liberal' && player.id !== presidentId,
    )!;
    engine.setConnected(liberal.id, false);

    const president = room.findPlayer(presidentId)!;
    engine.handleCommand(president.id, { kind: 'endTurn' });
    engine.handleCommand(president.id, { kind: 'endTurn' });

    expect(room.winner).toBe('fascist');
    expect(room.phase).toBe(Phase.GameOver);
  });

  it('Should keep playing when a Fascist leaves and Liberals still lead', () => {
    const { engine, room, players } = startGame([
      'Ana',
      'Ben',
      'Cal',
      'Dia',
      'Eli',
    ]);
    const presidentId = room.presidentId!;
    const fascist = players.find(
      (player) => player.role !== 'liberal' && player.id !== presidentId,
    )!;
    engine.setConnected(fascist.id, false);

    const president = room.findPlayer(presidentId)!;
    engine.handleCommand(president.id, { kind: 'endTurn' });
    engine.handleCommand(president.id, { kind: 'endTurn' });

    expect(room.winner).toBeNull();
    expect(room.phase).toBe(Phase.Nomination);
  });

  it('Should open the nomination window when the President starts nomination', () => {
    const { engine, room, players } = startGame();
    const [president, ben] = players;
    expect(room.nominationEndsAt).toBe(0);

    // Only the President may end discussion early.
    expect(engine.handleCommand(ben.id, { kind: 'endTurn' })?.code).toBe(
      'INVALID_ACTION',
    );
    expect(room.discussionEndsAt).toBeGreaterThan(0);

    engine.handleCommand(president.id, { kind: 'endTurn' });
    expect(room.discussionEndsAt).toBe(0);
    expect(room.nominationEndsAt).toBeGreaterThan(0);
  });

  it('Should open nomination when the discussion window elapses', () => {
    const { engine, room } = startGame();
    expect(room.nominationEndsAt).toBe(0);

    engine.resolveDiscussionTimeout();
    expect(room.discussionEndsAt).toBe(0);
    expect(room.nominationEndsAt).toBeGreaterThan(0);
  });

  it('Should fail the election when the President ends the round', () => {
    const { engine, room, players } = startGame();
    const [president, ben] = players;
    // End discussion so the nomination window opens.
    engine.handleCommand(president.id, { kind: 'endTurn' });
    expect(room.nominationEndsAt).toBeGreaterThan(0);

    expect(engine.handleCommand(president.id, { kind: 'endTurn' })).toBeNull();
    expect(room.electionTracker).toBe(1);
    expect(room.presidentId).toBe(ben.id);
  });

  it('Should fail the election when the nomination window elapses', () => {
    const { engine, room } = startGame();
    expect(room.phase).toBe(Phase.Nomination);

    engine.resolveNominationTimeout();
    expect(room.electionTracker).toBe(1);
    expect(room.phase).toBe(Phase.Nomination);
  });

  it('Should enact the top policy after three failed nominations', () => {
    const deck = new StackedDeck(['liberal']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);

    game.engine.resolveNominationTimeout();
    game.engine.resolveNominationTimeout();
    game.engine.resolveNominationTimeout();

    expect(game.room.liberalPolicies).toBe(1);
    expect(game.room.electionTracker).toBe(0);
  });

  it('Should close discussion during the legislative session', () => {
    const game = startGame();
    electGovernment(game, game.players[1]);
    expect(game.room.phase).toBe(Phase.PresidentLegislative);
    expect(game.room.discussionEndsAt).toBe(0);
  });

  it('Should broadcast chat from any player during discussion', () => {
    const { engine, players } = startGame();
    const [president, ben] = players;
    const heard: string[] = [];
    engine.on('chat', ({ message }) => heard.push(message.name));

    engine.postChat(ben.id, 'psst');
    engine.postChat(president.id, 'over here');
    expect(heard).toEqual([ben.name, president.name]);
  });
});

describe('GameEngine — legislative session', () => {
  it('Should hand the President three policies after a successful election', () => {
    const deck = new StackedDeck(['liberal', 'fascist', 'fascist', 'liberal']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);
    electGovernment(game, game.players[1]);

    expect(game.room.phase).toBe(Phase.PresidentLegislative);
    expect(game.room.drawnPolicies).toEqual(['liberal', 'fascist', 'fascist']);
  });

  it('Should auto-discard for the President when the timer elapses', () => {
    const deck = new StackedDeck(['liberal', 'fascist', 'fascist']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);
    electGovernment(game, game.players[1]);
    expect(game.room.phase).toBe(Phase.PresidentLegislative);

    game.engine.resolveLegislativeTimeout();
    expect(game.room.phase).toBe(Phase.ChancellorLegislative);
    expect(game.room.drawnPolicies).toHaveLength(2);
  });

  it('Should auto-enact for the Chancellor when the timer elapses', () => {
    const deck = new StackedDeck(['liberal', 'fascist', 'fascist']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);
    const [president, chancellor] = game.players;
    electGovernment(game, chancellor);

    game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: 0 });
    expect(game.room.phase).toBe(Phase.ChancellorLegislative);
    game.engine.resolveLegislativeTimeout();

    expect(game.room.liberalPolicies + game.room.fascistPolicies).toBe(1);
    expect(game.room.phase).not.toBe(Phase.ChancellorLegislative);
  });

  it('Should reject a discard from anyone but the President', () => {
    const game = startGame();
    electGovernment(game, game.players[1]);
    const error = game.engine.handleCommand(game.players[1].id, {
      kind: 'discardPolicy',
      index: 0,
    });
    expect(error).toMatchObject({ code: 'INVALID_ACTION' });
  });

  it('Should pass the remaining two policies to the Chancellor after the discard', () => {
    const deck = new StackedDeck(['liberal', 'fascist', 'fascist']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);
    const [president, chancellor] = game.players;
    electGovernment(game, chancellor);

    const error = game.engine.handleCommand(president.id, {
      kind: 'discardPolicy',
      index: 0,
    });
    expect(error).toBeNull();
    expect(game.room.phase).toBe(Phase.ChancellorLegislative);
    expect(game.room.drawnPolicies).toEqual(['fascist', 'fascist']);
    expect(game.room.deck.discardCount).toBe(1);
  });

  it('Should enact the Chancellor\'s choice and open the next round', () => {
    const deck = new StackedDeck(['liberal', 'fascist', 'fascist']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);
    const [president, chancellor] = game.players;
    electGovernment(game, chancellor);

    game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: 1 });
    const error = game.engine.handleCommand(chancellor.id, {
      kind: 'enactPolicy',
      index: 0,
    });

    expect(error).toBeNull();
    expect(game.room.liberalPolicies).toBe(1);
    expect(game.room.lastEnacted).toEqual(['liberal']);
    expect(game.room.drawnPolicies).toEqual([]);
    expect(game.room.phase).toBe(Phase.Nomination);
    // Presidency rotates to the next seat and a fresh discussion opens.
    expect(game.room.presidentId).toBe(game.players[1].id);
    expect(game.room.discussionEndsAt).toBeGreaterThan(0);
  });

  it('Should reject an out-of-range policy index', () => {
    const game = startGame();
    const [president, chancellor] = game.players;
    electGovernment(game, chancellor);

    expect(
      game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: 3 }),
    ).toMatchObject({ code: 'INVALID_ACTION' });
    expect(
      game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: -1 }),
    ).toMatchObject({ code: 'INVALID_ACTION' });
  });

  it('Should end the game when the fifth liberal policy is enacted', () => {
    const deck = new StackedDeck(['liberal', 'fascist', 'fascist']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);
    const [president, chancellor] = game.players;
    game.room.liberalPolicies = 4;
    electGovernment(game, chancellor);

    game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: 1 });
    game.engine.handleCommand(chancellor.id, { kind: 'enactPolicy', index: 0 });

    expect(game.room.liberalPolicies).toBe(5);
    expect(game.room.phase).toBe(Phase.GameOver);
    expect(game.room.winner).toBe('liberal');
    expect(game.room.viewFor(president.id).winner).toBe('liberal');
  });

  it('Should record the Fascists as the winner on six fascist policies', () => {
    const deck = new StackedDeck(['fascist', 'liberal', 'liberal']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);
    const [president, chancellor] = game.players;
    game.room.fascistPolicies = 5;
    // Pin the Chancellor non-Hitler so the win comes from the 6th policy,
    // not the "Hitler elected after 3 fascist policies" shortcut.
    chancellor.role = 'liberal';
    electGovernment(game, chancellor);

    game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: 1 });
    game.engine.handleCommand(chancellor.id, { kind: 'enactPolicy', index: 0 });

    expect(game.room.fascistPolicies).toBe(6);
    expect(game.room.winner).toBe('fascist');
  });

  it('Should term-limit the last Chancellor from the next nomination', () => {
    const deck = new StackedDeck(['liberal', 'liberal', 'liberal']);
    const game = startGame(['Ana', 'Ben', 'Cal', 'Dan', 'Eve'], deck);
    const lastChancellor = game.players[2];
    lastChancellor.role = 'liberal'; // avoid the Hitler-Chancellor shortcut
    electGovernment(game, lastChancellor);
    game.engine.handleCommand(game.room.presidentId!, {
      kind: 'discardPolicy',
      index: 0,
    });
    game.engine.handleCommand(lastChancellor.id, { kind: 'enactPolicy', index: 0 });

    expect(game.room.phase).toBe(Phase.Nomination);
    expect(game.room.viewFor('x').ineligibleChancellors).toContain(
      lastChancellor.id,
    );
    const error = game.engine.handleCommand(game.room.presidentId!, {
      kind: 'nominateChancellor',
      targetId: lastChancellor.id,
    });
    expect(error).toMatchObject({ code: 'INVALID_ACTION' });
  });

  it('Should refuse legislative commands once the game is over', () => {
    const deck = new StackedDeck(['liberal', 'fascist', 'fascist']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);
    const [president, chancellor] = game.players;
    game.room.liberalPolicies = 4;
    electGovernment(game, chancellor);
    game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: 1 });
    game.engine.handleCommand(chancellor.id, { kind: 'enactPolicy', index: 0 });

    const error = game.engine.handleCommand(president.id, {
      kind: 'nominateChancellor',
      targetId: chancellor.id,
    });
    expect(error).toMatchObject({ code: 'INVALID_ACTION' });
  });
});

describe('GameEngine — veto', () => {
  function reachChancellorLegislative() {
    const deck = new StackedDeck(['liberal', 'liberal', 'liberal']);
    const game = startGame(['Ana', 'Ben', 'Cal', 'Dan', 'Eve'], deck);
    const [president, chancellor] = game.players;
    chancellor.role = 'liberal'; // avoid the Hitler-Chancellor shortcut
    game.room.fascistPolicies = 5; // veto unlocked
    electGovernment(game, chancellor);
    game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: 0 });
    return { game, president, chancellor };
  }

  it('Should fail the government when the President agrees to a veto', () => {
    const { game, president, chancellor } = reachChancellorLegislative();
    expect(game.room.viewFor(president.id).vetoUnlocked).toBe(true);

    game.engine.handleCommand(chancellor.id, { kind: 'vetoRequest' });
    expect(game.room.vetoRequested).toBe(true);

    game.engine.handleCommand(president.id, { kind: 'vetoConsent', agree: true });
    expect(game.room.drawnPolicies).toEqual([]);
    expect(game.room.phase).toBe(Phase.Nomination);
    expect(game.room.electionTracker).toBe(1);
  });

  it('Should require the Chancellor to enact when the President rejects', () => {
    const { game, president, chancellor } = reachChancellorLegislative();
    game.engine.handleCommand(chancellor.id, { kind: 'vetoRequest' });
    game.engine.handleCommand(president.id, { kind: 'vetoConsent', agree: false });

    expect(game.room.vetoRequested).toBe(false);
    expect(game.room.phase).toBe(Phase.ChancellorLegislative);
    const error = game.engine.handleCommand(chancellor.id, {
      kind: 'enactPolicy',
      index: 0,
    });
    expect(error).toBeNull();
    expect(game.room.liberalPolicies).toBe(1);
  });

  it('Should reject a veto before five fascist policies', () => {
    const deck = new StackedDeck(['liberal', 'liberal', 'liberal']);
    const game = startGame(['Ana', 'Ben', 'Cal'], deck);
    const [president, chancellor] = game.players;
    chancellor.role = 'liberal';
    electGovernment(game, chancellor);
    game.engine.handleCommand(president.id, { kind: 'discardPolicy', index: 0 });

    const error = game.engine.handleCommand(chancellor.id, { kind: 'vetoRequest' });
    expect(error).toMatchObject({ code: 'INVALID_ACTION' });
  });
});
