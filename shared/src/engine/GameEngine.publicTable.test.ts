import { describe, expect, it } from '@rstest/core';
import { GameEngine } from './GameEngine';
import { LOBBY_AFK_MS, LOBBY_DISCONNECT_MS, Phase } from '../types/GameState';
import { makeRoom, seatPlayers } from '../../test/test-utils';

function publicEngine(minPlayers = 5, maxPlayers = 10) {
  return new GameEngine(makeRoom({ kind: 'public', minPlayers, maxPlayers }));
}

describe('GameEngine — public table', () => {
  it('Should seat the first player without making them host', () => {
    const engine = publicEngine();
    const [ana, ben] = seatPlayers(engine, ['Ana', 'Ben']);
    expect(ana.isHost).toBe(false);
    expect(engine.room.hostId).toBe('');
    expect(ben.isHost).toBe(false);
  });

  it('Should refuse a host-style start on the public table', () => {
    const engine = publicEngine(3, 3);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.startGame(players[0].id)).toMatchObject({ code: 'NOT_HOST' });
    expect(engine.room.phase).toBe(Phase.Lobby);
  });

  it('Should ignore Ready and deal when a full table all Accept', () => {
    const engine = publicEngine(3, 3);
    const [ana, ben, cal] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    engine.setReady(ana.id, true);
    expect(ana.ready).toBe(false);
    expect(engine.room.startChoice).not.toBeNull();
    expect(engine.setWantStart(ana.id, true)).toBeNull();
    expect(engine.setWantStart(ben.id, true)).toBeNull();
    expect(engine.setWantStart(cal.id, true)).toBeNull();
    expect(engine.room.phase).toBe(Phase.Nomination);
    expect(engine.room.players).toHaveLength(3);
    expect(engine.room.hostId).toBe(ana.id);
    expect(ana.isHost).toBe(true);
  });

  it('Should pass the host on a public table when they leave mid-game', () => {
    const engine = publicEngine(3, 3);
    const [ana, ben, cal] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.setWantStart(ana.id, true)).toBeNull();
    expect(engine.setWantStart(ben.id, true)).toBeNull();
    expect(engine.setWantStart(cal.id, true)).toBeNull();
    engine.removePlayer(ana.id);
    expect(engine.room.hostId).toBe(ben.id);
    expect(ben.isHost).toBe(true);
    expect(engine.room.phase).not.toBe(Phase.Lobby);
    expect(engine.room.phase).not.toBe(Phase.GameOver);
  });

  it('Should open Accept when a ten-seat public lobby is capped to six', () => {
    const engine = publicEngine(5, 10);
    seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay']);
    expect(engine.room.startChoice).toBeNull();
    engine.applyPublicSeatCap(6);
    expect(engine.room.options.maxPlayers).toBe(6);
    expect(engine.room.startChoice).not.toBeNull();
    expect(engine.room.phase).toBe(Phase.Lobby);
  });

  it('Should open an Accept window only when the public table is full', () => {
    const engine = publicEngine(5, 6);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    expect(engine.room.startChoice).toBeNull();
    expect(engine.setWantStart(players[0].id, true)).toMatchObject({
      code: 'INVALID_ACTION',
    });
    seatPlayers(engine, ['Fay']);
    expect(engine.room.startChoice).not.toBeNull();
    expect(engine.room.phase).toBe(Phase.Lobby);
  });

  it('Should kick silent holdouts and still refuse a table below the minimum', () => {
    const engine = publicEngine(5, 6);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay']);
    engine.setWantStart(players[0].id, true);
    engine.setWantStart(players[1].id, true);
    engine.setWantStart(players[2].id, true);
    const ejected: string[] = [];
    engine.on('lobbyPlayersEjected', ({ playerIds }) => ejected.push(...playerIds));

    engine.resolveStartChoiceTimeout();

    expect(engine.room.findPlayer(players[3].id)).toBeUndefined();
    expect(engine.room.findPlayer(players[4].id)).toBeUndefined();
    expect(engine.room.findPlayer(players[5].id)).toBeUndefined();
    expect(ejected.sort()).toEqual([players[3].id, players[4].id, players[5].id].sort());
    expect(engine.room.phase).toBe(Phase.Lobby);
    expect(engine.room.players).toHaveLength(3);
    expect(engine.room.startChoice).toBeNull();
  });

  it('Should not ban a sitter kicked for missing Accept', () => {
    const engine = publicEngine(3, 3);
    const [ana, ben, cal] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    const joinKey = 'client:eeeeeeee-bbbb-cccc-dddd-eeeeeeeeeeee';
    cal.joinKey = joinKey;
    engine.setWantStart(ana.id, true);
    engine.setWantStart(ben.id, true);
    engine.resolveStartChoiceTimeout();
    expect(engine.room.findPlayer(cal.id)).toBeUndefined();
    expect(engine.room.bannedJoinKeys.size).toBe(0);
    expect(engine.addPlayer('Cal', false, undefined, joinKey)).toMatchObject({
      name: 'Cal',
    });
  });

  it('Should deal after holdouts Accept during the window', () => {
    const engine = publicEngine(5, 5);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    expect(engine.room.startChoice).not.toBeNull();
    for (const player of players) {
      expect(engine.setWantStart(player.id, true)).toBeNull();
    }
    expect(engine.room.phase).toBe(Phase.Nomination);
    expect(engine.room.players).toHaveLength(5);
  });

  it('Should deal after kicking holdouts when a legal table remains', () => {
    const engine = publicEngine(3, 5);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    engine.setWantStart(players[0].id, true);
    engine.setWantStart(players[1].id, true);
    engine.setWantStart(players[2].id, true);
    engine.resolveStartChoiceTimeout();
    expect(engine.room.findPlayer(players[3].id)).toBeUndefined();
    expect(engine.room.findPlayer(players[4].id)).toBeUndefined();
    expect(engine.room.phase).toBe(Phase.Nomination);
    expect(engine.room.players).toHaveLength(3);
  });

  it('Should refuse retracting Accept once the window is open', () => {
    const engine = publicEngine(5, 6);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay']);
    engine.setWantStart(players[0].id, true);
    expect(engine.setWantStart(players[0].id, false)).toMatchObject({
      code: 'INVALID_ACTION',
    });
    expect(players[0].wantsStart).toBe(true);
  });

  it('Should still let a holdout Accept during the window', () => {
    const engine = publicEngine(5, 6);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay']);
    players[3].wantStartAt = Date.now();
    expect(engine.setWantStart(players[3].id, true)).toBeNull();
    expect(players[3].wantsStart).toBe(true);
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

  it('Should refuse Accept while a public lobby kick vote is open', () => {
    const engine = publicEngine();
    const [ana, ben, cal] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.requestKick(ana.id, ben.id)).toBeNull();
    expect(engine.setWantStart(cal.id, true)?.code).toBe('INVALID_ACTION');
    expect(cal.wantsStart).toBe(false);
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

  it('Should kick a public sitter who sits idle for five minutes', () => {
    const engine = publicEngine();
    const [ana] = seatPlayers(engine, ['Ana']);
    ana.unreadySince = Date.now() - LOBBY_AFK_MS;
    engine.resolveLobbyAfkTimeout(ana.id);
    expect(engine.room.findPlayer(ana.id)).toBeUndefined();
  });

  it('Should not AFK-kick a public sitter who already Accepted', () => {
    const engine = publicEngine(3, 3);
    const [ana, ben] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    engine.setWantStart(ana.id, true);
    engine.removePlayer(ben.id);
    expect(engine.room.startChoice).toBeNull();
    ana.unreadySince = Date.now() - LOBBY_AFK_MS;
    engine.resolveLobbyAfkTimeout(ana.id);
    expect(engine.room.findPlayer(ana.id)).toBeTruthy();
  });

  it('Should not ban a public sitter who was kicked for sitting idle', () => {
    const engine = publicEngine();
    const [ana] = seatPlayers(engine, ['Ana']);
    const joinKey = 'client:dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee';
    ana.joinKey = joinKey;
    ana.unreadySince = Date.now() - LOBBY_AFK_MS;
    engine.resolveLobbyAfkTimeout(ana.id);
    expect(engine.room.bannedJoinKeys.size).toBe(0);
    expect(engine.addPlayer('Ana', false, undefined, joinKey)).toMatchObject({
      name: 'Ana',
    });
  });

  it('Should pause AFK while the public Accept window is open', () => {
    const engine = publicEngine(5, 6);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay']);
    expect(engine.room.startChoice).not.toBeNull();
    players[3].unreadySince = Date.now() - LOBBY_AFK_MS;
    engine.resolveLobbyAfkTimeout(players[3].id);
    expect(engine.room.findPlayer(players[3].id)).toBeTruthy();
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
