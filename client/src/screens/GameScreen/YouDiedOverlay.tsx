import { useApp } from '../../services/AppContext';
import type { FormatMessage } from '../../i18n';
import { Button } from '../../components/Button/Button';
import styles from './YouDiedOverlay.module.scss';

export interface YouDiedOverlayProps {
  formatMessage: FormatMessage;
  onStay: () => void;
  onLeave: () => void;
}

/** Shown only to the executed player: stay as a spectator, or leave. */
export function YouDiedOverlay(props: YouDiedOverlayProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
      onClick={(event) => {
        if (event.target === event.currentTarget) props.onStay();
      }}
    >
      <div
        class={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        ref={(element) => void animation.play(element, 'pop-in')}
      >
        <span class={styles.title}>{formatMessage('game.killed.title')}</span>
        <p class={styles.message}>{formatMessage('game.killed.message')}</p>
        <div class={styles.buttons}>
          <Button variant="outline" onClick={() => props.onLeave()}>
            {formatMessage('game.killed.leave')}
          </Button>
          <Button onClick={() => props.onStay()}>
            {formatMessage('game.killed.stay')}
          </Button>
        </div>
      </div>
    </div>
  );
}
