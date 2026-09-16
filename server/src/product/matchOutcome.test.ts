import { describe, expect, it } from '@rstest/core';
import { GameEngine, RoomFactory, type Role } from '@secret-hitler/shared';
import { matchOutcomeOf } from './matchOutcome';

function seat(roles: Role[]) {
  const room = RoomFactory.create({ name: 'Friday', minPlayers: roles.length });
  const engine = new GameEngine(room);
  roles.forEach((role, index) => {
    const player = engine.addPlayer(`P${index}`);
    if ('code' in player) throw new Error(player.code);
    room.findPlayer(player.id)!.role = role;
  });
  return room;
}

describe('matchOutcomeOf', () => {
  it('Should call five liberal policies a liberal policy win', () => {
    const room = seat(['liberal', 'fascist', 'hitler']);
    room.winner = 'liberal';
    room.liberalPolicies = 5;
    expect(matchOutcomeOf(room)).toBe('liberal_policy');
  });

  it('Should call a dead Hitler a Hitler-executed win', () => {
    const room = seat(['liberal', 'fascist', 'hitler']);
    room.winner = 'liberal';
    const hitler = room.players.find((player) => player.role === 'hitler')!;
    hitler.isAlive = false;
    expect(matchOutcomeOf(room)).toBe('hitler_executed');
  });

  it('Should call six fascist policies a fascist policy win', () => {
    const room = seat(['liberal', 'fascist', 'hitler']);
    room.winner = 'fascist';
    room.fascistPolicies = 6;
    expect(matchOutcomeOf(room)).toBe('fascist_policy');
  });

  it('Should call Hitler as chancellor a Hitler-elected win', () => {
    const room = seat(['liberal', 'fascist', 'hitler']);
    room.winner = 'fascist';
    room.fascistPolicies = 3;
    room.chancellorId = room.players.find((player) => player.role === 'hitler')!.id;
    expect(matchOutcomeOf(room)).toBe('hitler_elected');
  });

  it('Should call a fascist numbers win when Hitler is not chancellor', () => {
    const room = seat(['liberal', 'fascist', 'hitler']);
    room.winner = 'fascist';
    room.fascistPolicies = 2;
    room.chancellorId = room.players.find((player) => player.role === 'liberal')!.id;
    expect(matchOutcomeOf(room)).toBe('fascist_numbers');
  });
});
