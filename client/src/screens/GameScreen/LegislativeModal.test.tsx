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
  }> = {},
) {
  renderWithApp(
    () => (
      <LegislativeModal
        mode={overrides.mode ?? 'discard'}
        policies={overrides.policies ?? ['liberal', 'fascist', 'fascist']}
        presidentId="you"
        chancellorId="cal"
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
  it('Should deal face-down cards before the President sees the faces', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    renderModal(harness);

    expect(screen.getByText(en.game.legislativeDeal)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.game.liberal })).toBeNull();
    expect(screen.queryByText('18s')).toBeNull();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: en.game.liberal })).toBeTruthy();
    });
    expect(screen.getAllByRole('button', { name: en.game.fascist })).toHaveLength(2);
    expect(screen.getByText(en.game.presidentDiscardHint)).toBeTruthy();
    expect(screen.getByText('18s')).toBeTruthy();
  });

  it('Should keep policy faces private from spectators', async () => {
    const harness = buildHarness({ seated: true });
    renderModal(harness, { policies: [] });

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
    await waitFor(() => {
      expect(picked).toEqual([0]);
    });

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

  it('Should skip the deal when joining a legislative window late', async () => {
    const harness = buildHarness({ seated: true });
    renderModal(harness, { startedAt: Date.now() - 8_000 });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: en.game.liberal })).toBeTruthy();
    });
    expect(screen.queryByText(en.game.legislativeDeal)).toBeNull();
  });
});
