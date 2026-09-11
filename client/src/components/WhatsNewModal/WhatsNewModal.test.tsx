import { afterEach, describe, expect, it } from '@rstest/core';
import { screen } from '@solidjs/testing-library';
import { WhatsNewModal } from './WhatsNewModal';
import { APP_PACKAGE_VERSION } from '../../services/update';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('WhatsNewModal', () => {
  it('Should stay hidden on a first visit and remember the running version', () => {
    const harness = buildHarness();
    renderWithApp(() => <WhatsNewModal />, harness);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(localStorage.getItem('sh:seen-changelog')).toBe(APP_PACKAGE_VERSION);
  });

  it('Should stay hidden when the archive has no notes', () => {
    localStorage.setItem('sh:seen-changelog', '0.0.0');
    const harness = buildHarness();
    renderWithApp(() => <WhatsNewModal />, harness);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('Should stay silent at the table even when a later briefing could wait', () => {
    localStorage.setItem('sh:seen-changelog', '0.0.0');
    const harness = buildHarness();
    harness.services.nav.navigate('game');
    renderWithApp(() => <WhatsNewModal />, harness);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('Should stay out of the way of the sample briefing in development', () => {
    window.history.replaceState(null, '', '/?update=1');
    localStorage.setItem('sh:seen-changelog', '0.0.0');
    const harness = buildHarness();
    renderWithApp(() => <WhatsNewModal />, harness);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
