import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { ChangelogDialog } from './ChangelogDialog';
import { PREVIEW_RELEASES } from '../../changelog/preview';
import { en } from '../../i18n/locales/en';
import { fa } from '../../i18n/locales/fa';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('ChangelogDialog', () => {
  it('Should stay closed until it is asked to open', () => {
    const harness = buildHarness();
    renderWithApp(
      () => (
        <ChangelogDialog
          open={false}
          title={en.changelog.whatsNew}
          actionLabel={en.changelog.continue}
          releases={PREVIEW_RELEASES}
          language="en"
          formatMessage={harness.services.i18n.formatMessage}
          onAction={() => undefined}
        />
      ),
      harness,
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('Should show the English notes and run the action', () => {
    const harness = buildHarness();
    let acted = false;
    renderWithApp(
      () => (
        <ChangelogDialog
          open
          title={en.changelog.whatsNew}
          actionLabel={en.changelog.continue}
          releases={PREVIEW_RELEASES}
          language="en"
          formatMessage={harness.services.i18n.formatMessage}
          onAction={() => {
            acted = true;
          }}
        />
      ),
      harness,
    );

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText(en.changelog.whatsNew)).toBeTruthy();
    expect(screen.getByText(PREVIEW_RELEASES[0]!.changes[0]!.en)).toBeTruthy();
    expect(screen.queryByText(PREVIEW_RELEASES[0]!.changes[0]!.fa)).toBeNull();

    fireEvent.click(screen.getByText(en.changelog.continue));
    expect(acted).toBe(true);
  });

  it('Should show the Persian notes when that language is active', () => {
    const harness = buildHarness();
    harness.services.settings.set('language', 'fa');
    renderWithApp(
      () => (
        <ChangelogDialog
          open
          title={fa.changelog.whatsNew}
          actionLabel={fa.changelog.continue}
          releases={PREVIEW_RELEASES}
          language="fa"
          formatMessage={harness.services.i18n.formatMessage}
          onAction={() => undefined}
        />
      ),
      harness,
    );

    expect(screen.getByText(PREVIEW_RELEASES[0]!.changes[0]!.fa)).toBeTruthy();
    expect(screen.queryByText(PREVIEW_RELEASES[0]!.changes[0]!.en)).toBeNull();
  });
});
