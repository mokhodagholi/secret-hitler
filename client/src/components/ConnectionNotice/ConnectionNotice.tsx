import { createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { useApp } from '../../services/AppContext';
import { reloadToLatest } from '../../services/update';

/** Ignore socket flaps so a 200ms drop does not flash the table. */
export const RECONNECT_NOTICE_GRACE_MS = 1000;
/** After this, stop promising a reconnect and offer a full reopen. */
export const RECONNECT_GIVE_UP_MS = 10_000;

export interface ConnectionNoticeProps {
  /** Tests inject this so a click does not navigate the jsdom document. */
  onReload?: () => void;
}

/**
 * Blocking reconnect card while the browser is offline, or while a seated
 * player is off the socket. After {@link RECONNECT_GIVE_UP_MS}, the copy
 * admits failure and the only action is to open the app again.
 */
export function ConnectionNotice(props: ConnectionNoticeProps = {}) {
  const { socket, game, i18n } = useApp();
  const { formatMessage } = i18n;
  const [held, setHeld] = createSignal(false);
  const [gaveUp, setGaveUp] = createSignal(false);
  const [browserOnline, setBrowserOnline] = createSignal(
    typeof navigator === 'undefined' || navigator.onLine,
  );
  const socketDown = createMemo(() => socket.status() !== 'connected');

  onMount(() => {
    const goOnline = () => setBrowserOnline(true);
    const goOffline = () => setBrowserOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    onCleanup(() => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    });
  });

  createEffect(() => {
    const dropped =
      game.roomClosedNotice() == null &&
      (!browserOnline() || (game.inRoom() && socketDown()));
    if (!dropped) {
      setHeld(false);
      setGaveUp(false);
      return;
    }
    const showTimer = window.setTimeout(() => setHeld(true), RECONNECT_NOTICE_GRACE_MS);
    const failTimer = window.setTimeout(() => setGaveUp(true), RECONNECT_GIVE_UP_MS);
    onCleanup(() => {
      clearTimeout(showTimer);
      clearTimeout(failTimer);
    });
  });

  return (
    <ConfirmDialog
      open={held()}
      message={formatMessage(gaveUp() ? 'connection.failed' : 'connection.lost')}
      confirmLabel={gaveUp() ? formatMessage('connection.reload') : undefined}
      onConfirm={
        gaveUp()
          ? () => {
              (props.onReload ?? reloadToLatest)();
            }
          : undefined
      }
    />
  );
}
