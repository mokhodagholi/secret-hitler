import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Button } from '../Button/Button';
import {
  UPDATE_POLL_MS,
  activateWaitingAndReload,
  checkForUpdate,
  isUpdatePromptVisible,
} from '../../services/update';
import styles from './UpdateModal.module.scss';

const skipPoll =
  import.meta.env.DEV || process.env.NODE_ENV === 'test';

/**
 * Forced update after a deploy. Silent while the table is live so a vote
 * is never interrupted; the seal drops as soon as they leave the game.
 */
export function UpdateModal() {
  const { nav, i18n } = useApp();
  const { formatMessage } = i18n;
  const [available, setAvailable] = createSignal(false);
  const open = () => isUpdatePromptVisible(available(), nav.screen());

  onMount(() => {
    if (skipPoll) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled || available()) return;
      if (await checkForUpdate()) setAvailable(true);
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
    <Show when={open()}>
      <div class={styles.backdrop} role="presentation">
        <div class={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="update-title">
          <h2 id="update-title" class={styles.title}>
            {formatMessage('update.title')}
          </h2>
          <div class={styles.action}>
            <Button onClick={() => void activateWaitingAndReload()}>
              {formatMessage('update.action')}
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
}
