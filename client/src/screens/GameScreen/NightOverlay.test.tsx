import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import {
  NightOverlay,
  CEREMONY_MS,
  DEAL_MS,
  LOOK_AT_MS,
} from './NightOverlay';
import { en } from '../../i18n/locales/en';
import { buildHarness, makePlayer, renderWithApp } from '../../../test/test-utils';

const players = [
  makePlayer({ id: 'you', name: 'You', seat: 0 }),
  makePlayer({ id: 'ana', name: 'Ana', seat: 1 }),
];

function renderOverlay(
  harness: ReturnType<typeof buildHarness>,
  overrides: { startedAt?: number; onDone?: () => void } = {},
) {
  renderWithApp(
    () => (
      <NightOverlay
        role="liberal"
        playerCount={5}
        players={players}
        youId="you"
        teammates={[]}
        presidentName="Ana"
        startedAt={overrides.startedAt ?? Date.now()}
        onDone={overrides.onDone ?? (() => {})}
      />
    ),
    harness,
  );
}

describe('NightOverlay', () => {
  it('Should deal face-down cards before night or the private role', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    renderOverlay(harness);

    expect(screen.getByText(en.ravi.deal.start)).toBeTruthy();
    expect(screen.queryByText(en.ravi.private.youLiberal)).toBeNull();
    expect(screen.queryByText(en.ravi.night.start)).toBeNull();
    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.deal.start);
    });
  });

  it('Should open night with the private role after the deal', () => {
    const harness = buildHarness({ seated: true });
    renderOverlay(harness, { startedAt: Date.now() - DEAL_MS - 80 });

    expect(screen.getByText(en.ravi.night.start)).toBeTruthy();
    expect(screen.getByText(en.ravi.private.youLiberal)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.game.gotIt })).toBeTruthy();
  });

  it('Should not end the ceremony when the player taps Got it', async () => {
    const harness = buildHarness({ seated: true });
    let done = 0;
    renderOverlay(harness, {
      startedAt: Date.now() - LOOK_AT_MS - 80,
      onDone: () => {
        done += 1;
      },
    });

    fireEvent.click(screen.getByRole('button', { name: en.game.gotIt }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(done).toBe(0);
    expect(screen.getByRole('dialog', { name: en.game.yourRole })).toBeTruthy();
  });

  it('Should close on the shared clock even if nobody taps', async () => {
    const harness = buildHarness({ seated: true });
    let done = 0;
    renderOverlay(harness, {
      startedAt: Date.now() - CEREMONY_MS - 50,
      onDone: () => {
        done += 1;
      },
    });

    await waitFor(() => {
      expect(done).toBe(1);
    });
  });
});
