import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { GameOverOverlay } from './GameOverOverlay';
import { en } from '../../i18n/locales/en';
import { buildHarness, makePlayer, renderWithApp } from '../../../test/test-utils';

describe('GameOverOverlay', () => {
  it('Should offer stay and leave after a win', () => {
    const harness = buildHarness({ seated: true });
    let continued = 0;
    let left = 0;
    renderWithApp(
      () => (
        <GameOverOverlay
          formatMessage={harness.services.i18n.formatMessage}
          winner="liberal"
          players={[
            makePlayer({ id: 'you', name: 'You', seat: 0, role: 'liberal' }),
            makePlayer({ id: 'cal', name: 'Cal', seat: 1, role: 'fascist' }),
          ]}
          youId="you"
          showRoles
          wantsContinue={false}
          onContinue={() => {
            continued += 1;
          }}
          onLeave={() => {
            left += 1;
          }}
        />
      ),
      harness,
    );

    expect(screen.getByText(en.game.over.liberalsWin)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.game.over.stay }));
    expect(continued).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: en.game.leaveRoom }));
    expect(left).toBe(1);
  });

  it('Should wait after this player has chosen to stay', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(
      () => (
        <GameOverOverlay
          formatMessage={harness.services.i18n.formatMessage}
          winner="fascist"
          players={[makePlayer({ id: 'you', name: 'You', seat: 0, role: 'hitler' })]}
          youId="you"
          showRoles
          wantsContinue
          onContinue={() => {}}
          onLeave={() => {}}
        />
      ),
      harness,
    );

    expect(screen.getByText(en.game.over.waiting)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.game.over.stay })).toHaveProperty(
      'disabled',
      true,
    );
  });
});
