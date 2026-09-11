import { describe, expect, it } from '@rstest/core';
import {
  logLineKey,
  namedIsYou,
  raviKickVoteLine,
  raviNominatedLine,
} from './perspective';

describe('perspective', () => {
  it('Should detect when a log name is the viewer', () => {
    expect(namedIsYou('Ana', 'Ana')).toBe(true);
    expect(namedIsYou('Cal', 'Ana')).toBe(false);
    expect(namedIsYou('', 'Ana')).toBe(false);
  });

  it('Should pick first-person nomination log lines', () => {
    expect(
      logLineKey('nominated', { president: 'You', chancellor: 'Cal' }, 'You'),
    ).toBe('log.nominatedYou');
    expect(
      logLineKey('nominated', { president: 'Ana', chancellor: 'You' }, 'You'),
    ).toBe('log.nominatedAsYou');
    expect(
      logLineKey('nominated', { president: 'Ana', chancellor: 'Cal' }, 'You'),
    ).toBe('log.nominated');
    expect(
      logLineKey(
        'nominated',
        { president: 'You', chancellor: 'Cal', presidentId: 'ana', chancellorId: 'cal' },
        'You',
        'you',
      ),
    ).toBe('log.nominated');
  });

  it('Should pick first-person kick-vote log lines', () => {
    expect(
      logLineKey('kickVoteStarted', { name: 'You', target: 'Cal' }, 'You'),
    ).toBe('log.kickVoteStartedYou');
    expect(
      logLineKey('kickVoteStarted', { name: 'Ana', target: 'You' }, 'You'),
    ).toBe('log.kickVoteStartedOnYou');
    expect(
      logLineKey('kickVoteStarted', { name: 'Ana', target: 'Cal' }, 'You'),
    ).toBe('log.kickVoteStarted');
    expect(
      logLineKey(
        'kickVoteStarted',
        { name: 'You', target: 'Cal', requesterId: 'ana', targetId: 'cal' },
        'You',
        'you',
      ),
    ).toBe('log.kickVoteStarted');
    expect(
      logLineKey(
        'kickVotePassed',
        { name: 'Cal', requester: 'You', requesterId: 'you', targetId: 'cal' },
        'You',
        'you',
      ),
    ).toBe('log.kickVotePassedYou');
    expect(
      logLineKey(
        'kickVoteFailed',
        { name: 'You', requester: 'Ana', requesterId: 'ana', targetId: 'you' },
        'You',
        'you',
      ),
    ).toBe('log.kickVoteFailedOnYou');
  });

  it('Should pick first-person Ravi kick-vote lines', () => {
    expect(
      raviKickVoteLine('kickVoteStarted', { name: 'You', target: 'Cal' }, 'You'),
    ).toBe('kick.askedYou');
    expect(
      raviKickVoteLine('kickVoteStarted', { name: 'Ana', target: 'You' }, 'You'),
    ).toBe('kick.askedOnYou');
    expect(
      raviKickVoteLine('kickVoteStarted', { name: 'Ana', target: 'Cal' }, 'You'),
    ).toBe('kick.asked');
    expect(
      raviKickVoteLine(
        'kickVotePassed',
        { name: 'Cal', requester: 'Ana', requesterId: 'you', targetId: 'cal' },
        'You',
        'you',
      ),
    ).toBe('kick.passedYou');
    expect(
      raviKickVoteLine(
        'kickVotePassed',
        { name: 'You', requester: 'Ana', requesterId: 'ana', targetId: 'you' },
        'You',
        'you',
      ),
    ).toBe('kick.passedOnYou');
    expect(
      raviKickVoteLine(
        'kickVoteFailed',
        { name: 'Cal', requester: 'Ana', requesterId: 'ana', targetId: 'cal' },
        'You',
        'you',
      ),
    ).toBe('kick.failed');
  });

  it('Should pick first-person Ravi nomination lines', () => {
    expect(
      raviNominatedLine({ president: 'You', chancellor: 'Cal' }, 'You'),
    ).toBe('nominate.namedYou');
    expect(
      raviNominatedLine({ president: 'Ana', chancellor: 'You' }, 'You'),
    ).toBe('nominate.namedAsYou');
    expect(
      raviNominatedLine({ president: 'Ana', chancellor: 'Cal' }, 'You'),
    ).toBe('nominate.named');
    expect(
      raviNominatedLine(
        { president: 'You', chancellor: 'Cal', presidentId: 'ana', chancellorId: 'cal' },
        'You',
        'you',
      ),
    ).toBe('nominate.named');
    expect(
      raviNominatedLine(
        { president: 'Ana', chancellor: 'Cal', presidentId: 'you', chancellorId: 'cal' },
        'You',
        'you',
      ),
    ).toBe('nominate.namedYou');
  });
});
