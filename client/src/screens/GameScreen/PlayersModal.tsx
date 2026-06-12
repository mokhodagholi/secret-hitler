import { For, Show } from 'solid-js';
import type { PublicPlayer } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import { PlayerRow } from './PlayerRow';
import styles from './PlayersModal.module.scss';

export interface PlayersModalProps {
  open: boolean;
  players: PublicPlayer[];
  youId: string;
  formatMessage: FormatMessage;
  canNominate: (player: PublicPlayer) => boolean;
  onNominate: (player: PublicPlayer) => void;
  onClose: () => void;
}

/** Sheet listing every player, opened from the board's player-count chip. */
export function PlayersModal(props: PlayersModalProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  const seated = () => [...props.players].sort((a, b) => a.seat - b.seat);

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
          aria-label={formatMessage('game.playersTitle')}
          ref={(element) => void animation.play(element, 'pop-in')}
        >
          <header class={styles.header}>
            <span class={styles.title}>{formatMessage('game.playersTitle')}</span>
            <button
              type="button"
              class={styles.close}
              aria-label={formatMessage('common.goBack')}
              onClick={() => props.onClose()}
            >
              <Icon name="close" size={20} />
            </button>
          </header>

          <div class={styles.list}>
            <For each={seated()}>
              {(player) => (
                <PlayerRow
                  player={player}
                  isYou={player.id === props.youId}
                  nominatable={props.canNominate(player)}
                  onNominate={() => props.onNominate(player)}
                  formatMessage={formatMessage}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
}
