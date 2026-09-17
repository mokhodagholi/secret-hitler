import { createSignal } from 'solid-js';
import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import type { Policy } from '@secret-hitler/shared';
import { LegislativeModal } from './LegislativeModal';
import { en } from '../../i18n/locales/en';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

function renderModal(
  harness: ReturnType<typeof buildHarness>,
  overrides: Partial<{
    mode: 'discard' | 'enact';
    policies: Policy[];
    startedAt: number;
    secondsLeft: number;
    youId: string;
    presidentId: string;
    chancellorId: string;
  }> = {},
) {
  renderWithApp(
    () => (
      <LegislativeModal
        mode={overrides.mode ?? 'discard'}
        policies={overrides.policies ?? ['liberal', 'fascist', 'fascist']}
        presidentId={overrides.presidentId ?? 'you'}
        chancellorId={overrides.chancellorId ?? 'cal'}
        youId={overrides.youId ?? 'you'}
        presidentName="You"
        chancellorName="Cal"
        secondsLeft={overrides.secondsLeft ?? 18}
        canVeto={false}
        startedAt={overrides.startedAt ?? Date.now() + 8_000}
        onPick={() => {}}
        onVeto={() => {}}
        formatMessage={harness.services.i18n.formatMessage}
      />
    ),
    harness,
  );
}

describe('LegislativeModal', () => {
  it('Should show policy faces to the President from the start', () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    renderModal(harness);

    expect(screen.getByRole('button', { name: en.game.liberal })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: en.game.fascist })).toHaveLength(2);
    expect(screen.getByText(en.game.presidentDiscardHint)).toBeTruthy();
    expect(screen.getByText('18s')).toBeTruthy();
    expect(screen.queryByText(en.game.legislativeDealYou)).toBeNull();
  });

  it('Should keep policy faces private from spectators', async () => {
    const harness = buildHarness({ seated: true });
    renderModal(harness, { policies: [], youId: 'cal' });

    expect(screen.getByText(en.game.legislativeDeal)).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.getByText(en.game.presidentChoosing.replace('{name}', 'You')),
      ).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: en.game.liberal })).toBeNull();
    expect(screen.queryByRole('button', { name: en.game.fascist })).toBeNull();
  });

  it('Should pass two face-down cards to the Chancellor after the President picks', async () => {
    const harness = buildHarness({ seated: true });
    const [mode, setMode] = createSignal<'discard' | 'enact'>('discard');
    const [policies, setPolicies] = createSignal<Policy[]>([
      'liberal',
      'fascist',
      'fascist',
    ]);
    const picked: number[] = [];

    renderWithApp(
      () => (
        <LegislativeModal
          mode={mode()}
          policies={policies()}
          presidentId="you"
          chancellorId="cal"
          youId="you"
          presidentName="You"
          chancellorName="Cal"
          secondsLeft={18}
          canVeto={false}
          startedAt={Date.now() + 8_000}
          onPick={(index) => {
            picked.push(index);
            setPolicies([]);
            setMode('enact');
          }}
          onVeto={() => {}}
          formatMessage={harness.services.i18n.formatMessage}
        />
      ),
      harness,
    );

    const liberal = await waitFor(() =>
      screen.getByRole('button', { name: en.game.liberal }),
    );
    fireEvent.click(liberal);
    expect(picked).toEqual([0]);

    await waitFor(() => {
      expect(screen.getByText(en.game.legislativePass)).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: en.game.liberal })).toBeNull();

    await waitFor(() => {
      expect(
        screen.getByText(en.game.chancellorChoosing.replace('{name}', 'Cal')),
      ).toBeTruthy();
    });
  });

  it('Should skip the deal when joining a legislative window late', () => {
    const harness = buildHarness({ seated: true });
    renderModal(harness, { startedAt: Date.now() - 8_000 });

    expect(screen.getByRole('button', { name: en.game.liberal })).toBeTruthy();
    expect(screen.queryByText(en.game.legislativeDealYou)).toBeNull();
  });

  it('Should show policy faces to the Chancellor from the start', () => {
    const harness = buildHarness({ seated: true });
    renderModal(harness, {
      mode: 'enact',
      policies: ['liberal', 'fascist'],
      youId: 'cal',
    });
    expect(screen.getByRole('button', { name: en.game.liberal })).toBeTruthy();
    expect(screen.getByRole('button', { name: en.game.fascist })).toBeTruthy();
    expect(screen.getByText(en.game.chancellorEnactHint)).toBeTruthy();
    expect(screen.queryByText(en.game.legislativePassYou)).toBeNull();
  });

  it('Should enact as soon as the Chancellor taps a face', async () => {
    const harness = buildHarness({ seated: true });
    const picked: number[] = [];
    renderWithApp(
      () => (
        <LegislativeModal
          mode="enact"
          policies={['liberal', 'fascist']}
          presidentId="you"
          chancellorId="cal"
          youId="cal"
          presidentName="You"
          chancellorName="Cal"
          secondsLeft={18}
          canVeto={false}
          startedAt={Date.now() + 8_000}
          onPick={(index) => {
            picked.push(index);
          }}
          onVeto={() => {}}
          formatMessage={harness.services.i18n.formatMessage}
        />
      ),
      harness,
    );

    fireEvent.click(screen.getByRole('button', { name: en.game.liberal }));
    expect(picked).toEqual([0]);
  });

  it('Should enact on pointer down, before a click arrives', () => {
    const harness = buildHarness({ seated: true });
    const picked: number[] = [];
    renderWithApp(
      () => (
        <LegislativeModal
          mode="enact"
          policies={['liberal', 'fascist']}
          presidentId="you"
          chancellorId="cal"
          youId="cal"
          presidentName="You"
          chancellorName="Cal"
          secondsLeft={18}
          canVeto={false}
          startedAt={Date.now() + 8_000}
          onPick={(index) => {
            picked.push(index);
          }}
          onVeto={() => {}}
          formatMessage={harness.services.i18n.formatMessage}
        />
      ),
      harness,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: en.game.liberal }), {
      button: 0,
    });
    expect(picked).toEqual([0]);
  });

  it('Should hide the choice clock as soon as a card is tapped', () => {
    const harness = buildHarness({ seated: true });
    renderModal(harness, { secondsLeft: 18, startedAt: Date.now() - 1_000 });

    expect(screen.getByText('18s')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.game.liberal }));
    expect(screen.queryByText('18s')).toBeNull();
  });

  it('Should let the player drag the legislative panel aside', () => {
    const harness = buildHarness({ seated: true });
    renderModal(harness);

    const handle = screen.getByRole('separator', { name: en.game.moveDialog });
    fireEvent.pointerDown(handle, {
      button: 0,
      clientX: 8,
      clientY: 8,
      pointerId: 1,
    });
    fireEvent.pointerMove(handle, { clientX: 28, clientY: 48, pointerId: 1 });

    expect(screen.getByRole('dialog').parentElement?.style.transform).toBe(
      'translate(20px, 40px)',
    );
  });
});
