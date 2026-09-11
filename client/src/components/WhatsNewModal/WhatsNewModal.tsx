import { createSignal, onMount } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { CHANGELOG_RELEASES } from '../../changelog/releases';
import {
  acknowledgedVersion,
  readSeenVersion,
  releasesSince,
  rememberCurrentIfUnseen,
  writeSeenVersion,
} from '../../changelog/changelog';
import {
  APP_PACKAGE_VERSION,
  isUpdatePreview,
  isUpdatePromptVisible,
} from '../../services/update';
import { ChangelogDialog } from '../ChangelogDialog/ChangelogDialog';

/**
 * After a new build loads, show notes the player has not dismissed yet.
 * A first visit just remembers the running version so install is not a popup.
 */
export function WhatsNewModal() {
  const { nav, i18n } = useApp();
  const { formatMessage } = i18n;
  const [seen, setSeen] = createSignal(readSeenVersion());

  onMount(() => {
    rememberCurrentIfUnseen(APP_PACKAGE_VERSION);
    setSeen(readSeenVersion());
  });

  const notes = () => {
    const last = seen();
    if (last == null) return [];
    return releasesSince(CHANGELOG_RELEASES, last);
  };
  const open = () =>
    !isUpdatePreview() && isUpdatePromptVisible(notes().length > 0, nav.screen());

  return (
    <ChangelogDialog
      open={open()}
      title={formatMessage('changelog.whatsNew')}
      actionLabel={formatMessage('changelog.continue')}
      releases={notes()}
      language={i18n.lang()}
      formatMessage={formatMessage}
      onAction={() => {
        const seenVersion = acknowledgedVersion(APP_PACKAGE_VERSION, CHANGELOG_RELEASES);
        writeSeenVersion(seenVersion);
        setSeen(seenVersion);
      }}
    />
  );
}
