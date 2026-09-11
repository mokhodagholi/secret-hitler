import { describe, expect, it } from '@rstest/core';
import { screen, waitFor } from '@solidjs/testing-library';
import { InvestigateOverlay } from './InvestigateOverlay';
import { en } from '../../i18n/locales/en';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('InvestigateOverlay', () => {
  it('Should announce Liberal after the party card is shown', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    renderWithApp(
      () => (
        <InvestigateOverlay
          targetId="cal"
          targetName="Cal"
          party="liberal"
          onContinue={() => {}}
          formatMessage={harness.services.i18n.formatMessage}
        />
      ),
      harness,
    );

    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.power.investigatedLiberal);
    });
    expect(
      screen.getByText(
        en.game.power.investigationResult
          .replace('{name}', 'Cal')
          .replace('{party}', en.game.liberal),
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.game.power.continue })).toBeNull();
  });

  it('Should announce Fascist after the party card is shown', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    renderWithApp(
      () => (
        <InvestigateOverlay
          targetId="cal"
          targetName="Cal"
          party="fascist"
          onContinue={() => {}}
          formatMessage={harness.services.i18n.formatMessage}
        />
      ),
      harness,
    );

    await waitFor(() => {
      expect(harness.services.ravi.line()).toBe(en.ravi.power.investigatedFascist);
    });
  });

  it('Should keep the party face private when the viewer is not the President', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    let continued = 0;
    renderWithApp(
      () => (
        <InvestigateOverlay
          targetId="cal"
          targetName="Cal"
          party={null}
          onContinue={() => {
            continued += 1;
          }}
          formatMessage={harness.services.i18n.formatMessage}
        />
      ),
      harness,
    );

    await waitFor(
      () => {
        expect(continued).toBe(1);
      },
      { timeout: 6000 },
    );
    expect(harness.services.ravi.line()).toBeNull();
    expect(screen.queryByAltText(en.game.liberal)).toBeNull();
    expect(screen.queryByAltText(en.game.fascist)).toBeNull();
    expect(screen.queryByText(en.ravi.power.investigatedLiberal)).toBeNull();
    expect(screen.queryByText(en.ravi.power.investigatedFascist)).toBeNull();
  });

  it('Should show the party face to the investigated player without the President whisper', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('raviVoice', false);
    renderWithApp(
      () => (
        <InvestigateOverlay
          targetId="you"
          targetName="You"
          party="fascist"
          announce={false}
          onContinue={() => {}}
          formatMessage={harness.services.i18n.formatMessage}
        />
      ),
      harness,
    );

    await waitFor(() => {
      expect(screen.getByAltText(en.game.fascist)).toBeTruthy();
    });
    expect(harness.services.ravi.line()).toBeNull();
    expect(
      screen.queryByText(
        en.game.power.investigationResult
          .replace('{name}', 'You')
          .replace('{party}', en.game.fascist),
      ),
    ).toBeNull();
  });
});
