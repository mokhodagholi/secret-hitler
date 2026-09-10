import { afterEach, describe, expect, it } from '@rstest/core';
import { Phase } from '@secret-hitler/shared';
import {
  LEAVE_OPEN,
  discussOpenLine,
  resetLeaveOpenPick,
} from './discussOpen';

afterEach(() => {
  resetLeaveOpenPick();
});

describe('discussOpenLine', () => {
  it('Should keep the first-day and quiet-round line as discuss.start', () => {
    expect(discussOpenLine(Phase.Nomination, false, false)).toBe('discuss.start');
    expect(discussOpenLine(Phase.ChancellorLegislative, false, false)).toBe(
      'discuss.start',
    );
  });

  it('Should use afterFail only after a failed government', () => {
    expect(discussOpenLine(Phase.Voting, false, true)).toBe('discuss.afterFail');
  });

  it('Should use afterPower only after an executive power', () => {
    expect(discussOpenLine(Phase.SpecialPower, false, false)).toBe(
      'discuss.afterPower',
    );
    expect(discussOpenLine(Phase.SpecialPower, false, true)).toBe(
      'discuss.afterPower',
    );
  });

  it('Should never pick a leave or power line on a failed vote', () => {
    const id = discussOpenLine(Phase.Voting, false, true);
    expect(id).toBe('discuss.afterFail');
    expect(LEAVE_OPEN).not.toContain(id);
  });

  it('Should pick a leave joke only after someone left', () => {
    const id = discussOpenLine(Phase.Nomination, true, false, () => 0);
    expect(LEAVE_OPEN).toContain(id);
  });

  it('Should prefer a leave joke over the power line when both apply', () => {
    const id = discussOpenLine(Phase.SpecialPower, true, false, () => 0);
    expect(LEAVE_OPEN).toContain(id);
    expect(id).not.toBe('discuss.afterPower');
  });

  it('Should shuffle leave jokes and skip the last one', () => {
    const first = discussOpenLine(null, true, false, () => 0);
    const second = discussOpenLine(null, true, false, () => 0);
    expect(LEAVE_OPEN).toContain(first);
    expect(LEAVE_OPEN).toContain(second);
    expect(second).not.toBe(first);
  });

  it('Should never randomly pick afterPower', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(discussOpenLine(Phase.Nomination, false, false)).not.toBe(
        'discuss.afterPower',
      );
      expect(discussOpenLine(Phase.Voting, false, true)).not.toBe(
        'discuss.afterPower',
      );
    }
  });
});
