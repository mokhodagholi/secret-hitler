import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import type { RoundHistoryEntry } from '@secret-hitler/shared';
import { en } from '../../i18n/locales/en';
import { buildHarness, renderWithApp } from '../../../test/test-utils';
import { RoundHistoryModal } from './RoundHistoryModal';

const SAMPLE: RoundHistoryEntry = {
  round: 1,
  presidentId: 'ana',
  presidentName: 'Ana',
  chancellorId: 'ben',
  chancellorName: 'Ben',
  ballots: [
    { playerId: 'ana', name: 'Ana', vote: 'ja', abstained: false },
    { playerId: 'ben', name: 'Ben', vote: 'nein', abstained: false },
    { playerId: 'cal', name: 'Cal', vote: 'nein', abstained: true },
  ],
  ja: 1,
  nein: 2,
  elected: false,
  nominationFailed: false,
  vetoAgreed: false,
  chaos: false,
  enacted: null,
  power: null,
};

describe('RoundHistoryModal', () => {
  it('Should list rounds collapsed and expand to show ballots', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(
      () => (
        <RoundHistoryModal
          open
          rounds={[SAMPLE]}
          formatMessage={harness.services.i18n.formatMessage}
          onClose={() => {}}
        />
      ),
      harness,
    );

    expect(screen.getByText(en.game.historyTitle)).toBeTruthy();
    expect(
      screen.getByText(en.game.history.round.replace('{n}', '1')),
    ).toBeTruthy();
    expect(screen.queryByText(en.game.history.votes)).toBeNull();

    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(en.game.history.round.replace('{n}', '1')),
      }),
    );

    expect(screen.getByText(en.game.history.votes)).toBeTruthy();
    expect(screen.getByText(en.vote.ja)).toBeTruthy();
    expect(screen.getByText(en.game.history.abstained, { exact: false })).toBeTruthy();
  });
});
