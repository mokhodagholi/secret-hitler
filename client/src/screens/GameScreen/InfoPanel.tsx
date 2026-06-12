import { For, Show } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import styles from './InfoPanel.module.scss';

export interface InfoPanelProps {
  open: boolean;
  rows: { label: string; value: string }[];
  formatMessage: FormatMessage;
  onClose: () => void;
}

/** Slide-up sheet with the round's secondary details (turn, status, etc.). */
export function InfoPanel(props: InfoPanelProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  return (
    <Show when={props.open}>
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
      onClick={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div
        class={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={formatMessage('game.infoTitle')}
        ref={(element) => void animation.play(element, 'pop-in')}
      >
        <header class={styles.header}>
          <span class={styles.title}>{formatMessage('game.infoTitle')}</span>
          <button
            type="button"
            class={styles.close}
            aria-label={formatMessage('common.goBack')}
            onClick={() => props.onClose()}
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <dl class={styles.rows}>
          <For each={props.rows}>
            {(row) => (
              <div class={styles.row}>
                <dt class={styles.label}>{row.label}</dt>
                <dd class={styles.value}>{row.value}</dd>
              </div>
            )}
          </For>
        </dl>
      </div>
    </div>
    </Show>
  );
}
