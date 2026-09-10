import { describe, expect, it } from '@rstest/core';
import { logLineKey, namedIsYou, raviNominatedLine } from './perspective';

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
