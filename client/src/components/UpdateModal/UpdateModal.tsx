import { createSignal, onCleanup, onMount } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { PREVIEW_RELEASES } from '../../changelog/preview';
import {
  fetchRemoteChangelog,
  writeSeenVersion,
  type ChangelogRelease,
} from '../../changelog/changelog';
import {
  UPDATE_POLL_MS,
  activateWaitingAndReload,
  checkForUpdate,
  clearUpdatePreview,
  isUpdatePreview,
  isUpdatePromptVisible,
} from '../../services/update';
import { ChangelogDialog } from '../ChangelogDialog/ChangelogDialog';

const skipPoll =
  import.meta.env.DEV || process.env.NODE_ENV === 'test';

/**
 * Forced update after a deploy. Silent while the table is live so a vote
 * is never interrupted; the seal drops as soon as they leave the game.
 * `?update=1` opens a sample briefing in dev so the card can be reviewed.
 */
export function UpdateModal() {
  const { nav, i18n } = useApp();
  const { formatMessage } = i18n;
  const preview = isUpdatePreview();
  const [available, setAvailable] = createSignal(preview);
  const [notes, setNotes] = createSignal<ChangelogRelease[]>(preview ? PREVIEW_RELEASES : []);
  const open = () => isUpdatePromptVisible(available(), nav.screen());

  onMount(() => {
    if (preview) return;
    if (skipPoll) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || available()) return;
      if (await checkForUpdate()) {
        setAvailable(true);
        setNotes(await fetchRemoteChangelog());
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.update().catch(() => undefined)));
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), UPDATE_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    onCleanup(() => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    });
  });

  return (
    <ChangelogDialog
      open={open()}
      title={formatMessage('update.title')}
      actionLabel={formatMessage('update.action')}
      releases={notes()}
      language={i18n.lang()}
      formatMessage={formatMessage}
      onAction={() => {
        if (preview) {
          setAvailable(false);
          clearUpdatePreview();
          return;
        }
        const newest = notes()[0];
        if (newest) writeSeenVersion(newest.version);
        void activateWaitingAndReload();
      }}
    />
  );
}
