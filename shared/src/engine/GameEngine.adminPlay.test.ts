import { describe, expect, it } from '@rstest/core';
import { Phase } from '../types/GameState';
import { GameEngine } from './GameEngine';
import {
  flushBreath,
  makeRoom,
  releaseChoiceHolds,
  seatPlayers,
  skipOpeningNight,
} from '../../test/test-utils';

function startAdminPlay() {
  const room = makeRoom({ adminPlayUserId: 1_902_004_260 });
  const engine = new GameEngine(room);
  const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eve']);
  for (const player of players) engine.setReady(player.id, true);
  const started = engine.startGame(players[0].id);
  expect(started).toBeNull();
  const first = players[0];
  if (first) {
    room.presidentId = first.id;
    if (room.currentRound) {
      room.currentRound.presidentId = first.id;
      room.currentRound.presidentName = first.name;
    }
  }
  skipOpeningNight(room);
  engine.endDiscussion();
  return { engine, room, players };
}

describe('GameEngine — admin play', () => {
  it('Should elect when the human votes Ja — every seat mirrors', () => {
    const { engine, room, players } = startAdminPlay();
    const [president, chancellor] = players;
    engine.handleCommand(president.id, {
      kind: 'nominateChancellor',
      targetId: chancellor.id,
    });
    expect(room.phase).toBe(Phase.Voting);

    engine.handleCommand(president.id, { kind: 'castVote', vote: 'ja' });

    expect(room.phase).toBe(Phase.PresidentLegislative);
    expect([...room.votes.values()].every((vote) => vote === 'ja')).toBe(true);
  });

  it('Should fail the election when the human votes Nein — every seat mirrors', () => {
    const { engine, room, players } = startAdminPlay();
    const [president, chancellor] = players;
    engine.handleCommand(president.id, {
      kind: 'nominateChancellor',
      targetId: chancellor.id,
    });

    engine.handleCommand(president.id, { kind: 'castVote', vote: 'nein' });
    flushBreath(engine);

    expect(room.phase).toBe(Phase.Nomination);
    expect(room.electionTracker).toBe(1);
  });

  it('Should skip an announce breath on skipTimer', () => {
    const room = makeRoom({
      adminPlayUserId: 1_902_004_260,
      skipCeremony: false,
    });
    const engine = new GameEngine(room);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal', 'Dia', 'Eve']);
    for (const player of players) engine.setReady(player.id, true);
    expect(engine.startGame(players[0].id)).toBeNull();
    const first = players[0];
    if (first) {
      room.presidentId = first.id;
      if (room.currentRound) {
        room.currentRound.presidentId = first.id;
        room.currentRound.presidentName = first.name;
      }
    }
    skipOpeningNight(room);
    engine.endDiscussion();
    const [president, chancellor] = players;
    releaseChoiceHolds(room);
    engine.handleCommand(president.id, {
      kind: 'nominateChancellor',
      targetId: chancellor.id,
    });
    releaseChoiceHolds(room);
    engine.handleCommand(president.id, { kind: 'castVote', vote: 'nein' });
    expect(room.pendingBreath).not.toBeNull();

    expect(engine.handleCommand(president.id, { kind: 'skipTimer' })).toBeNull();
    expect(room.pendingBreath).toBeNull();
    expect(room.phase).toBe(Phase.Nomination);
  });

  it('Should refuse skipTimer on a normal table', () => {
    const room = makeRoom();
    const engine = new GameEngine(room);
    const players = seatPlayers(engine, ['Ana', 'Ben', 'Cal']);
    for (const player of players) engine.setReady(player.id, true);
    engine.startGame(players[0].id);
    skipOpeningNight(room);

    const refused = engine.handleCommand(players[0].id, { kind: 'skipTimer' });
    expect(refused?.code).toBe('INVALID_ACTION');
  });
});
