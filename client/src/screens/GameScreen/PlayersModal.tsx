import { Index, Show } from 'solid-js';
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
  showOffice?: boolean;
  onNominate: (player: PublicPlayer) => void;
  onClose: () => void;
}

/** Sheet listing every player, opened from the board's player-count chip. */
export function PlayersModal(props: PlayersModalProps) {
  const { formatMessage } = props;
  const { animation, flags, voice } = useApp();
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
            <Index each={seated()}>
              {(player) => (
                <div class={styles.entry}>
                  <div class={styles.seatRow}>
                    <PlayerRow
                      player={player()}
                      isYou={player().id === props.youId}
                      nominatable={props.canNominate(player())}
                      showOffice={props.showOffice}
                      onNominate={() => props.onNominate(player())}
                      formatMessage={formatMessage}
                    />
                  </div>
                  <Show when={flags.enabled('voice') && player().id !== props.youId}>
                    <button
                      type="button"
                      class={styles.mute}
                      aria-label={formatMessage(
                        voice.isRemoteMuted(player().id)
                          ? 'game.unmutePlayer'
                          : 'game.mutePlayer',
                        { name: player().name },
                      )}
                      aria-pressed={voice.isRemoteMuted(player().id)}
                      onClick={() => voice.toggleRemoteMute(player().id)}
                    >
                      <Icon
                        name={voice.isRemoteMuted(player().id) ? 'micOff' : 'mic'}
                        size={18}
                      />
                    </button>
                  </Show>
                </div>
              )}
            </Index>
          </div>
        </div>
      </div>
    </Show>
  );
}
