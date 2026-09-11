import { describe, expect, it } from '@rstest/core';
import { screen, waitFor } from '@solidjs/testing-library';
import { PeekOverlay } from './PeekOverlay';
import { en } from '../../i18n/locales/en';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('PeekOverlay', () => {
  it('Should show the three policy faces to the President', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(
      () => (
        <PeekOverlay
          policies={['liberal', 'fascist', 'liberal']}
          onContinue={() => {}}
          formatMessage={harness.services.i18n.formatMessage}
        />
      ),
      harness,
    );

    await waitFor(() => {
      expect(screen.getAllByAltText(en.game.liberal)).toHaveLength(2);
      expect(screen.getByAltText(en.game.fascist)).toBeTruthy();
    });
  });

  it('Should keep the three backs private from spectators', async () => {
    const harness = buildHarness({ seated: true });
    let continued = 0;
    renderWithApp(
      () => (
        <PeekOverlay
          policies={[]}
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
    expect(screen.queryByAltText(en.game.liberal)).toBeNull();
    expect(screen.queryByAltText(en.game.fascist)).toBeNull();
  });
});
