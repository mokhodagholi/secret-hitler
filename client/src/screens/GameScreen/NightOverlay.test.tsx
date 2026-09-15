import { describe, expect, it } from '@rstest/core';
import { screen, waitFor } from '@solidjs/testing-library';
import {
  NightOverlay,
  CEREMONY_MS,
  DEAL_MS,
  GLANCE_AT_MS,
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
  overrides: {
    startedAt?: number;
    onDone?: () => void;
    role?: 'liberal' | 'fascist' | 'hitler';
    playerCount?: number;
    players?: ReturnType<typeof makePlayer>[];
    teammates?: ReturnType<typeof makePlayer>[];
  } = {},
) {
  renderWithApp(
    () => (
      <NightOverlay
        role={overrides.role ?? 'liberal'}
        playerCount={overrides.playerCount ?? 5}
        players={overrides.players ?? players}
        youId="you"
        teammates={overrides.teammates ?? []}
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

    expect(screen.queryByText(en.ravi.deal.start)).toBeNull();
    expect(screen.queryByText(en.ravi.private.youLiberal)).toBeNull();
    expect(screen.queryByText(en.ravi.night.start)).toBeNull();
    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.deal.start);
    });
  });

  it('Should keep one face-down role card in the pile per seated player', () => {
    const harness = buildHarness({ seated: true });
    const table = [
      makePlayer({ id: 'you', name: 'You', seat: 0 }),
      makePlayer({ id: 'ana', name: 'Ana', seat: 1 }),
      makePlayer({ id: 'ben', name: 'Ben', seat: 2 }),
      makePlayer({ id: 'cam', name: 'Cam', seat: 3 }),
      makePlayer({ id: 'drew', name: 'Drew', seat: 4 }),
    ];
    renderOverlay(harness, { players: table, playerCount: table.length });

    expect(document.querySelectorAll('[data-role-pile] img')).toHaveLength(
      table.length,
    );
  });

  it('Should open night with the private role after the deal', async () => {
    const harness = buildHarness({ seated: true });
    renderOverlay(harness, { startedAt: Date.now() - DEAL_MS - 80 });

    await waitFor(() => {
      expect(screen.getByText(en.ravi.night.start)).toBeTruthy();
    });
    expect(screen.getByText(en.ravi.private.youLiberal)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.game.gotIt })).toBeNull();
  });

  it('Should keep the private role on screen until the shared clock', async () => {
    const harness = buildHarness({ seated: true });
    let done = 0;
    renderOverlay(harness, {
      startedAt: Date.now() - LOOK_AT_MS - 80,
      onDone: () => {
        done += 1;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(done).toBe(0);
    expect(screen.getByText(en.ravi.private.youLiberal)).toBeTruthy();
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

  it('Should wait with closed eyes instead of repeating the header line', async () => {
    const harness = buildHarness({ seated: true });
    renderOverlay(harness, { startedAt: Date.now() - GLANCE_AT_MS - 80 });

    await waitFor(() => {
      expect(screen.getByLabelText(en.ravi.private.nightLiberal)).toBeTruthy();
    });
    expect(screen.queryByText(en.ravi.private.nightLiberal)).toBeNull();
    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.private.nightLiberal);
    });
  });

  it('Should show teammates to Fascists and tell them to look', async () => {
    const harness = buildHarness({ seated: true });
    renderOverlay(harness, {
      role: 'fascist',
      startedAt: Date.now() - GLANCE_AT_MS - 80,
      teammates: [makePlayer({ id: 'ana', name: 'Ana', seat: 1, role: 'hitler' })],
    });

    await waitFor(() => {
      expect(screen.getByText(en.ravi.private.nightFascistSmall)).toBeTruthy();
    });
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText(en.role.hitler)).toBeTruthy();
    expect(document.querySelector('[data-teammate-seat]')?.textContent).toBe('2');
    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.private.nightFascistSmall);
    });
  });

  it('Should show teammates to Hitler on a 5–6 player table', async () => {
    const harness = buildHarness({ seated: true });
    renderOverlay(harness, {
      role: 'hitler',
      playerCount: 5,
      startedAt: Date.now() - GLANCE_AT_MS - 80,
      teammates: [makePlayer({ id: 'ana', name: 'Ana', seat: 1, role: 'fascist' })],
    });

    await waitFor(() => {
      expect(screen.getByText(en.ravi.private.nightHitlerSmall)).toBeTruthy();
    });
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText(en.role.fascist)).toBeTruthy();
    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.private.nightHitlerSmall);
    });
  });

  it('Should tell Hitler to keep their eyes closed at 7–10', async () => {
    const harness = buildHarness({ seated: true });
    renderOverlay(harness, {
      role: 'hitler',
      playerCount: 7,
      startedAt: Date.now() - GLANCE_AT_MS - 80,
      teammates: [makePlayer({ id: 'ana', name: 'Ana', seat: 1, role: 'fascist' })],
    });

    await waitFor(() => {
      expect(screen.getByLabelText(en.ravi.private.nightLiberal)).toBeTruthy();
    });
    expect(screen.queryByText('Ana')).toBeNull();
    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.private.nightLiberal);
    });
  });
});
