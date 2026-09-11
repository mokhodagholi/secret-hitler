import { afterEach, describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { UpdateModal } from './UpdateModal';
import { WhatsNewModal } from '../WhatsNewModal/WhatsNewModal';
import { PREVIEW_RELEASES } from '../../changelog/preview';
import { en } from '../../i18n/locales/en';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('UpdateModal', () => {
  it('Should stay hidden until the origin publishes a new build', () => {
    const harness = buildHarness();
    renderWithApp(() => <UpdateModal />, harness);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('Should open the sample briefing for ?update=1 and dismiss without reloading', () => {
    window.history.replaceState(null, '', '/?update=1');
    const harness = buildHarness();
    renderWithApp(() => <UpdateModal />, harness);

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText(en.update.title)).toBeTruthy();
    expect(screen.getByText(PREVIEW_RELEASES[0]!.changes[0]!.en)).toBeTruthy();

    fireEvent.click(screen.getByText(en.update.action));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(window.location.search).not.toContain('update=1');
  });

  it('Should dismiss as the only card even when a later briefing is also waiting', () => {
    window.history.replaceState(null, '', '/?update=1');
    localStorage.setItem('sh:seen-changelog', '0.0.0');
    const harness = buildHarness();
    renderWithApp(
      () => (
        <>
          <UpdateModal />
          <WhatsNewModal />
        </>
      ),
      harness,
    );

    expect(screen.getAllByRole('alertdialog')).toHaveLength(1);
    expect(screen.getByText(en.update.title)).toBeTruthy();
    fireEvent.click(screen.getByText(en.update.action));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
