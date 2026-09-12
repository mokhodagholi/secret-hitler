import { describe, expect, it } from '@rstest/core';
import { GameEngine } from './GameEngine';
import { LOBBY_AFK_MS, Phase, WANT_START_COOLDOWN_MS } from '../types/GameState';
import { makeRoom, seatPlayers } from '../../test/test-utils';

function publicEngine(minPlayers = 5) {
  return new GameEngine(makeRoom({ kind: 'public', minPlayers }));
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
    const engine = publicEngine(3);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.startGame(players[0].id)).toMatchObject({ code: 'NOT_HOST' });
    expect(engine.room.phase).toBe(Phase.Lobby);
  });

  it('Should ignore Ready and deal when everyone taps Start', () => {
    const engine = publicEngine(3);
    const [ana, ben, cal] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    engine.setReady(ana.id, true);
    expect(ana.ready).toBe(false);
    expect(engine.setWantStart(ana.id, true)).toBeNull();
    expect(engine.setWantStart(ben.id, true)).toBeNull();
    expect(engine.room.startChoice).not.toBeNull();
    expect(engine.setWantStart(cal.id, true)).toBeNull();
    expect(engine.room.phase).toBe(Phase.Nomination);
    expect(engine.room.players).toHaveLength(3);
  });

  it('Should open a must-choose window once half have tapped Start', () => {
    const engine = publicEngine(5);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay']);
    expect(engine.setWantStart(players[0].id, true)).toBeNull();
    expect(engine.setWantStart(players[1].id, true)).toBeNull();
    expect(engine.room.startChoice).toBeNull();
    expect(engine.setWantStart(players[2].id, true)).toBeNull();
    expect(engine.room.startChoice).not.toBeNull();
    expect(engine.room.phase).toBe(Phase.Lobby);
  });

  it('Should kick silent holdouts and still refuse a table below the minimum', () => {
    const engine = publicEngine(5);
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

  it('Should deal after holdouts tap Start during the must-choose window', () => {
    const engine = publicEngine(5);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    for (const player of players.slice(0, 3)) {
      engine.setWantStart(player.id, true);
    }
    expect(engine.room.startChoice).not.toBeNull();
    expect(engine.setWantStart(players[3].id, true)).toBeNull();
    expect(engine.setWantStart(players[4].id, true)).toBeNull();
    expect(engine.room.phase).toBe(Phase.Nomination);
    expect(engine.room.players).toHaveLength(5);
  });

  it('Should deal after kicking holdouts when a legal table remains', () => {
    const engine = publicEngine(3);
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

  it('Should refuse retracting Start once the must-choose window is open', () => {
    const engine = publicEngine(5);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay']);
    engine.setWantStart(players[0].id, true);
    engine.setWantStart(players[1].id, true);
    engine.setWantStart(players[2].id, true);
    expect(engine.setWantStart(players[0].id, false)).toMatchObject({
      code: 'INVALID_ACTION',
    });
    expect(players[0].wantsStart).toBe(true);
  });

  it('Should refuse another collecting Start tap for three minutes', () => {
    const engine = publicEngine(5);
    const [ana] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    expect(engine.setWantStart(ana.id, true)).toBeNull();
    expect(engine.setWantStart(ana.id, false)).toBeNull();
    expect(engine.setWantStart(ana.id, true)).toMatchObject({ code: 'INVALID_ACTION' });
    ana.wantStartAt = Date.now() - WANT_START_COOLDOWN_MS;
    expect(engine.setWantStart(ana.id, true)).toBeNull();
  });

  it('Should still let a holdout tap Start during the must-choose window', () => {
    const engine = publicEngine(5);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay']);
    engine.setWantStart(players[0].id, true);
    engine.setWantStart(players[1].id, true);
    engine.setWantStart(players[2].id, true);
    players[3].wantStartAt = Date.now();
    expect(engine.setWantStart(players[3].id, true)).toBeNull();
    expect(players[3].wantsStart).toBe(true);
  });

  it('Should let the public lobby vote someone out and ban their sit identity', () => {
    const engine = publicEngine();
    const [ana, ben, cal] = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    const joinKey = 'client:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    ben.joinKey = joinKey;
    expect(engine.requestKick(ana.id, ben.id)).toBeNull();
    expect(engine.voteKick(cal.id, true)).toBeNull();
    expect(engine.room.findPlayer(ben.id)).toBeUndefined();
    expect(engine.room.bannedJoinKeys.has(joinKey)).toBe(true);
    expect(engine.addPlayer('Ben', false, undefined, joinKey)).toMatchObject({
      code: 'BANNED',
    });
    expect(engine.addPlayer('Dia', false, undefined, 'client:bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee')).toMatchObject({
      name: 'Dia',
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

  it('Should ban a hosted-lobby guest the host kicks', () => {
    const engine = new GameEngine(makeRoom());
    const [host, guest] = seatPlayers(engine, ['Ana', 'Ben']);
    const joinKey = 'client:cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee';
    guest.joinKey = joinKey;
    expect(engine.kickPlayer(host.id, guest.id)).toBeNull();
    expect(engine.addPlayer('Ben', false, undefined, joinKey)).toMatchObject({
      code: 'BANNED',
    });
  });

  it('Should refuse Start while a public lobby kick vote is open', () => {
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

  it('Should kick a public sitter who does not tap Start for five minutes', () => {
    const engine = publicEngine();
    const [ana] = seatPlayers(engine, ['Ana']);
    ana.unreadySince = Date.now() - LOBBY_AFK_MS;
    engine.resolveLobbyAfkTimeout(ana.id);
    expect(engine.room.findPlayer(ana.id)).toBeUndefined();
  });

  it('Should not AFK-kick a public sitter who has already tapped Start', () => {
    const engine = publicEngine();
    const [ana] = seatPlayers(engine, ['Ana']);
    engine.setWantStart(ana.id, true);
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

  it('Should pause AFK while the public start-choice window is open', () => {
    const engine = publicEngine(5);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay']);
    engine.setWantStart(players[0].id, true);
    engine.setWantStart(players[1].id, true);
    engine.setWantStart(players[2].id, true);
    players[3].unreadySince = Date.now() - LOBBY_AFK_MS;
    engine.resolveLobbyAfkTimeout(players[3].id);
    expect(engine.room.findPlayer(players[3].id)).toBeTruthy();
  });
});
