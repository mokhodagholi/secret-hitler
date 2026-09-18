import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { GameOverOverlay, gameOverReason } from './GameOverOverlay';
import { en } from '../../i18n/locales/en';
import { buildHarness, makePlayer, renderWithApp } from '../../../test/test-utils';

describe('GameOverOverlay', () => {
  it('Should show why the board ended before the winner and rematch', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(
      () => (
        <GameOverOverlay
          formatMessage={harness.services.i18n.formatMessage}
          winner="liberal"
          players={[
            makePlayer({ id: 'you', name: 'You', seat: 0, role: 'liberal' }),
            makePlayer({
              id: 'cal',
              name: 'Cal',
              seat: 1,
              role: 'hitler',
              isAlive: false,
            }),
          ]}
          chancellorId="you"
          fascistPolicies={2}
          youId="you"
          showOutcome={false}
          wantsContinue={false}
          onContinue={() => {}}
          onLeave={() => {}}
        />
      ),
      harness,
    );

    expect(screen.getByText(en.game.over.reason.hitlerExecuted)).toBeTruthy();
    expect(screen.queryByText(en.game.over.liberalsWin)).toBeNull();
    expect(screen.queryByRole('button', { name: en.game.over.stay })).toBeNull();
    expect(screen.queryByText(en.role.hitler)).toBeNull();
  });

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
          chancellorId="you"
          fascistPolicies={0}
          youId="you"
          showOutcome
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

    expect(screen.getByText(en.game.over.reason.liberalPolicy)).toBeTruthy();
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
          chancellorId="you"
          fascistPolicies={3}
          youId="you"
          showOutcome
          wantsContinue
          onContinue={() => {}}
          onLeave={() => {}}
        />
      ),
      harness,
    );

    expect(screen.getByText(en.game.over.reason.hitlerElected)).toBeTruthy();
    expect(screen.getByText(en.game.over.waiting)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.game.over.stay })).toHaveProperty(
      'disabled',
      true,
    );
  });
});

describe('gameOverReason', () => {
  it('Should call a dead Hitler an execution win', () => {
    expect(
      gameOverReason({
        winner: 'liberal',
        fascistPolicies: 2,
        chancellorId: 'you',
        players: [
          { id: 'you', role: 'liberal', isAlive: true },
          { id: 'hitler', role: 'hitler', isAlive: false },
        ],
      }),
    ).toBe('hitlerExecuted');
  });

  it('Should call Hitler as Chancellor an elected win', () => {
    expect(
      gameOverReason({
        winner: 'fascist',
        fascistPolicies: 3,
        chancellorId: 'hitler',
        players: [{ id: 'hitler', role: 'hitler', isAlive: true }],
      }),
    ).toBe('hitlerElected');
  });
});
