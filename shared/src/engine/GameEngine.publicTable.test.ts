import { describe, expect, it } from '@rstest/core';
import { GameEngine } from './GameEngine';
import { LOBBY_AFK_MS, LOBBY_DISCONNECT_MS, Phase } from '../types/GameState';
import { makeRoom, seatPlayers } from '../../test/test-utils';

function publicEngine(minPlayers = 5, maxPlayers = 10) {
  return new GameEngine(makeRoom({ kind: 'public', minPlayers, maxPlayers }));
}

describe('GameEngine — public table', () => {
  it('Should make the first sitter host', () => {
    const engine = publicEngine();
    const [ana, ben] = seatPlayers(engine, ['Ana', 'Ben']);
    expect(ana.isHost).toBe(true);
    expect(engine.room.hostId).toBe(ana.id);
    expect(ben.isHost).toBe(false);
  });

  it('Should let the host start from five without waiting on Ready', () => {
    const engine = publicEngine(5, 10);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    expect(engine.canStart()).toBe(true);
    expect(engine.startGame(players[0].id)).toBeNull();
    expect(engine.room.phase).toBe(Phase.Nomination);
    expect(engine.room.players).toHaveLength(5);
  });

  it('Should refuse a guest starting the public table', () => {
    const engine = publicEngine(3, 10);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.startGame(players[1].id)).toMatchObject({ code: 'NOT_HOST' });
    expect(engine.room.phase).toBe(Phase.Lobby);
  });

  it('Should pass the host when they leave the lobby', () => {
    const engine = publicEngine();
    const [ana, ben] = seatPlayers(engine, ['Ana', 'Ben']);
    engine.removePlayer(ana.id);
    expect(engine.room.hostId).toBe(ben.id);
    expect(ben.isHost).toBe(true);
    expect(engine.room.phase).toBe(Phase.Lobby);
  });

  it('Should pass the host on a public table when they leave mid-game', () => {
    const engine = publicEngine(3, 10);
    const [ana, ben] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.startGame(ana.id)).toBeNull();
    engine.removePlayer(ana.id);
    expect(engine.room.hostId).toBe(ben.id);
    expect(ben.isHost).toBe(true);
    expect(engine.room.phase).not.toBe(Phase.Lobby);
    expect(engine.room.phase).not.toBe(Phase.GameOver);
  });

  it('Should not open an Accept window when the salon fills', () => {
    const engine = publicEngine(5, 6);
    seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay']);
    expect(engine.room.startChoice).toBeNull();
    expect(engine.room.phase).toBe(Phase.Lobby);
  });

  it('Should let a public sitter toggle Ready', () => {
    const engine = publicEngine();
    const [, ben] = seatPlayers(engine, ['Ana', 'Ben']);
    engine.setReady(ben.id, true);
    expect(ben.ready).toBe(true);
  });

  it('Should let the public lobby vote someone out without banning them', () => {
    const engine = publicEngine();
    const [ana, ben, cal] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    const joinKey = 'client:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    ben.joinKey = joinKey;
    expect(engine.requestKick(ana.id, ben.id)).toBeNull();
    expect(engine.voteKick(cal.id, true)).toBeNull();
    expect(engine.room.findPlayer(ben.id)).toBeUndefined();
    expect(engine.room.bannedJoinKeys.has(joinKey)).toBe(false);
    expect(engine.addPlayer('Ben', false, undefined, joinKey)).toMatchObject({
      name: 'Ben',
    });
  });

  it('Should refuse a public lobby kick with fewer than three connected sitters', () => {
    const engine = publicEngine();
    const [ana, ben] = seatPlayers(engine, ['Ana', 'Ben']);
    expect(engine.requestKick(ana.id, ben.id)?.code).toBe('INVALID_ACTION');
  });

  it('Should refuse a kick vote in a hosted lobby', () => {
    const engine = new GameEngine(makeRoom());
    const [ana, ben, cal] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.requestKick(ana.id, ben.id)?.code).toBe('INVALID_ACTION');
    expect(cal.isHost).toBe(false);
  });

  it('Should let a hosted-lobby guest rejoin after the host kicks', () => {
    const engine = new GameEngine(makeRoom());
    const [host, guest] = seatPlayers(engine, ['Ana', 'Ben']);
    const joinKey = 'client:cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee';
    guest.joinKey = joinKey;
    expect(engine.kickPlayer(host.id, guest.id)).toBeNull();
    expect(engine.room.bannedJoinKeys.has(joinKey)).toBe(false);
    expect(engine.addPlayer('Ben', false, undefined, joinKey)).toMatchObject({
      name: 'Ben',
    });
  });
});

describe('GameEngine — lobby AFK', () => {
  it('Should kick a connected guest who stays unready for five minutes', () => {
    const engine = new GameEngine(makeRoom());
    const [host, guest] = seatPlayers(engine, ['Ana', 'Ben']);
    guest.unreadySince = Date.now() - LOBBY_AFK_MS;
    const ejected: string[] = [];
    engine.on('lobbyPlayersEjected', ({ playerIds }) => ejected.push(...playerIds));
    engine.resolveLobbyAfkTimeout(guest.id);
    expect(engine.room.findPlayer(guest.id)).toBeUndefined();
    expect(ejected).toEqual([guest.id]);
    expect(engine.room.findPlayer(host.id)).toBeTruthy();
  });

  it('Should not kick the host for sitting unready', () => {
    const engine = new GameEngine(makeRoom());
    const [host] = seatPlayers(engine, ['Ana', 'Ben']);
    host.ready = false;
    host.unreadySince = Date.now() - LOBBY_AFK_MS;
    engine.resolveLobbyAfkTimeout(host.id);
    expect(engine.room.findPlayer(host.id)).toBeTruthy();
  });

  it('Should not kick the public host for sitting idle', () => {
    const engine = publicEngine();
    const [ana] = seatPlayers(engine, ['Ana']);
    ana.ready = false;
    ana.unreadySince = Date.now() - LOBBY_AFK_MS;
    engine.resolveLobbyAfkTimeout(ana.id);
    expect(engine.room.findPlayer(ana.id)).toBeTruthy();
  });

  it('Should kick a public guest who sits unready for five minutes', () => {
    const engine = publicEngine();
    const [, ben] = seatPlayers(engine, ['Ana', 'Ben']);
    const joinKey = 'client:dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee';
    ben.joinKey = joinKey;
    ben.unreadySince = Date.now() - LOBBY_AFK_MS;
    engine.resolveLobbyAfkTimeout(ben.id);
    expect(engine.room.findPlayer(ben.id)).toBeUndefined();
    expect(engine.room.bannedJoinKeys.size).toBe(0);
    expect(engine.addPlayer('Ben', false, undefined, joinKey)).toMatchObject({
      name: 'Ben',
    });
  });

  it('Should drop a disconnected lobby guest after fifteen seconds without a ban', () => {
    const engine = new GameEngine(makeRoom());
    const [host, guest] = seatPlayers(engine, ['Ana', 'Ben']);
    const joinKey = 'client:eeeeeeee-bbbb-cccc-dddd-eeeeeeeeeeee';
    guest.joinKey = joinKey;
    engine.setConnected(guest.id, false);
    guest.unreadySince = Date.now() - LOBBY_DISCONNECT_MS;
    const ejected: string[] = [];
    engine.on('lobbyPlayersEjected', ({ playerIds }) => ejected.push(...playerIds));
    engine.resolveLobbyAfkTimeout(guest.id);
    expect(engine.room.findPlayer(guest.id)).toBeUndefined();
    expect(engine.room.findPlayer(host.id)).toBeTruthy();
    expect(ejected).toEqual([guest.id]);
    expect(engine.room.bannedJoinKeys.size).toBe(0);
    expect(engine.addPlayer('Ben', false, undefined, joinKey)).toMatchObject({
      name: 'Ben',
    });
  });

  it('Should keep a disconnected lobby guest if they return before fifteen seconds', () => {
    const engine = new GameEngine(makeRoom());
    const [, guest] = seatPlayers(engine, ['Ana', 'Ben']);
    engine.setConnected(guest.id, false);
    engine.resolveLobbyAfkTimeout(guest.id);
    expect(engine.room.findPlayer(guest.id)).toBeTruthy();
    engine.setConnected(guest.id, true);
    guest.unreadySince = Date.now() - LOBBY_DISCONNECT_MS;
    engine.resolveLobbyAfkTimeout(guest.id);
    expect(engine.room.findPlayer(guest.id)).toBeTruthy();
  });
});
