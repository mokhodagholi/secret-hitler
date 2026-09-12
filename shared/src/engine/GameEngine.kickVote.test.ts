import { describe, expect, it } from '@rstest/core';
import { GameEngine } from './GameEngine';
import { Phase } from '../types/GameState';
import { startGame } from '../../test/test-utils';

describe('GameEngine — table kick vote', () => {
  it('Should pause phase clocks and broadcast the request to every viewer', () => {
    const { engine, room, players } = startGame(['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    const [ana, ben] = players;
    const discussionEnds = room.discussionEndsAt;
    const paused: Array<number | null> = [];
    engine.on('discussionTimerChanged', ({ endsAt }) => paused.push(endsAt));

    expect(engine.requestKick(ana.id, ben.id)).toBeNull();
    expect(room.kickVote?.targetId).toBe(ben.id);
    expect(room.kickVote?.votes.get(ana.id)).toBe(true);
    expect(room.kickVote?.needed).toBe(3);
    expect(room.discussionEndsAt).toBe(discussionEnds);
    expect(paused.at(-1)).toBeNull();

    const view = room.viewFor(calId(players));
    expect(view.kickVote?.requesterId).toBe(ana.id);
    expect(view.kickVote?.targetId).toBe(ben.id);
    expect(view.kickVote?.yourVote).toBeNull();
    expect(room.viewFor(ana.id).kickVote?.yourVote).toBe(true);
  });

  it('Should kick once half the living table votes yes', () => {
    const { engine, room, players } = startGame(['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    const [ana, ben, cal, dia] = players;
    engine.requestKick(ana.id, ben.id);
    expect(engine.voteKick(cal.id, true)).toBeNull();
    expect(ben.isAlive).toBe(true);

    expect(engine.voteKick(dia.id, true)).toBeNull();
    expect(ben.isAlive).toBe(false);
    expect(room.kickVote).toBeNull();
    expect(room.findPlayer(ben.id)).toBeTruthy();
  });

  it('Should keep the player when remaining votes cannot reach half', () => {
    const { engine, room, players } = startGame(['Ana', 'Ben', 'Cal']);
    const [ana, ben, cal] = players;
    const discussionEnds = room.discussionEndsAt;
    engine.requestKick(ana.id, ben.id);
    expect(engine.voteKick(cal.id, false)).toBeNull();
    expect(ben.isAlive).toBe(true);
    expect(room.kickVote).toBeNull();
    expect(room.discussionEndsAt).toBeGreaterThanOrEqual(discussionEnds);
  });

  it('Should resume the discussion clock after a failed kick vote', () => {
    const { engine, room, players } = startGame();
    const [ana, ben, cal] = players;
    const resumed: Array<number | null> = [];
    engine.on('discussionTimerChanged', ({ endsAt }) => resumed.push(endsAt));
    engine.requestKick(ana.id, ben.id);
    engine.voteKick(cal.id, false);
    expect(resumed.at(-1)).toBeGreaterThan(0);
    expect(room.discussionEndsAt).toBe(resumed.at(-1));
  });

  it('Should refuse a second request while a vote is open', () => {
    const { engine, players } = startGame();
    const [ana, ben, cal] = players;
    expect(engine.requestKick(ana.id, ben.id)).toBeNull();
    expect(engine.requestKick(cal.id, ana.id)?.code).toBe('INVALID_ACTION');
  });

  it('Should refuse a self-kick and a kick of a dead player', () => {
    const { engine, players } = startGame();
    const [ana, ben] = players;
    expect(engine.requestKick(ana.id, ana.id)?.code).toBe('INVALID_ACTION');
    ben.isAlive = false;
    expect(engine.requestKick(ana.id, ben.id)?.code).toBe('INVALID_ACTION');
  });

  it('Should block in-game commands while a kick vote is open', () => {
    const { engine, room, players } = startGame();
    const [president, ben, cal] = players;
    engine.requestKick(cal.id, ben.id);
    expect(
      engine.handleCommand(president.id, {
        kind: 'nominateChancellor',
        targetId: ben.id,
      })?.code,
    ).toBe('INVALID_ACTION');
    expect(room.phase).toBe(Phase.Nomination);
    expect(room.chancellorId).toBeNull();
  });

  it('Should ignore the accused and ignore a second ballot from the same voter', () => {
    const { engine, players } = startGame();
    const [ana, ben, cal] = players;
    engine.requestKick(ana.id, ben.id);
    expect(engine.voteKick(ben.id, false)?.code).toBe('INVALID_ACTION');
    expect(engine.voteKick(ana.id, true)?.code).toBe('INVALID_ACTION');
    expect(engine.voteKick(cal.id, true)).toBeNull();
    expect(ben.isAlive).toBe(false);
  });

  it('Should apply a timeout using the yes votes already cast', () => {
    const { engine, players } = startGame(['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    const [ana, ben] = players;
    engine.requestKick(ana.id, ben.id);
    engine.resolveKickVoteTimeout();
    expect(ben.isAlive).toBe(true);
    expect(engine.room.kickVote).toBeNull();
  });

  it('Should refuse a second kick request after a failed vote', () => {
    const { engine, room, players } = startGame();
    const [ana, ben, cal] = players;
    engine.requestKick(ana.id, ben.id);
    engine.voteKick(cal.id, false);
    expect(engine.requestKick(ana.id, cal.id)?.code).toBe('INVALID_ACTION');
    expect(room.viewFor(ana.id).you.canRequestKick).toBe(false);
    expect(engine.requestKick(cal.id, ben.id)).toBeNull();
  });

  it('Should let a requester ask again after their kick passes', () => {
    const { engine, room, players } = startGame(['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    const [ana, ben, cal, dia, eli] = players;
    engine.requestKick(ana.id, ben.id);
    engine.voteKick(cal.id, true);
    engine.voteKick(dia.id, true);
    expect(ben.isAlive).toBe(false);
    expect(room.viewFor(ana.id).you.canRequestKick).toBe(true);
    expect(engine.requestKick(ana.id, eli.id)).toBeNull();
    expect(room.kickVote?.targetId).toBe(eli.id);
  });

  it('Should ban the kicked player from sitting this table again', () => {
    const { engine, room, players } = startGame(['Ana', 'Ben', 'Cal', 'Dia', 'Eli']);
    const [ana, ben, cal, dia] = players;
    ben.joinKey = 'client:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    engine.requestKick(ana.id, ben.id);
    engine.voteKick(cal.id, true);
    engine.voteKick(dia.id, true);
    expect(ben.isAlive).toBe(false);
    expect(room.bannedJoinKeys.has(ben.joinKey)).toBe(true);
  });
});

function calId(players: { name: string; id: string }[]): string {
  return players.find((player) => player.name === 'Cal')?.id ?? '';
}
