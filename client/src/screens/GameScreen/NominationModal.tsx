import { For, Show } from 'solid-js';
import type { PublicPlayer } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import { PlayerRow } from './PlayerRow';
import styles from './NominationModal.module.scss';

export interface NominationModalProps {
  players: PublicPlayer[];
  youId: string;
  secondsLeft: number;
  canNominate: (player: PublicPlayer) => boolean;
  onNominate: (player: PublicPlayer) => void;
  onEndRound: () => void;
  formatMessage: FormatMessage;
}

/**
 * The President's timed nomination: every player is listed, eligible ones are
 * tappable. A 10-second countdown runs to the engine's auto-fail, and the
 * President can end the round early.
 */
export function NominationModal(props: NominationModalProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  const seated = () => [...props.players].sort((a, b) => a.seat - b.seat);

  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <div
        class={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={formatMessage('game.nominateTitle')}
        ref={(element) => void animation.play(element, 'pop-in')}
      >
        <header class={styles.header}>
          <span class={styles.title}>{formatMessage('game.nominateTitle')}</span>
          <span
            classList={{
              [styles.timer]: true,
              [styles.urgent]: props.secondsLeft <= 4,
              [styles.pulse]: props.secondsLeft <= 4 && animation.motionEnabled(),
            }}
          >
            <Icon name="clock" size={14} />
            {formatMessage('game.secondsLeft', { seconds: props.secondsLeft })}
          </span>
        </header>

        <div class={styles.list}>
          <For each={seated()}>
            {(player) => (
              <Show when={player.id !== props.youId}>
                <PlayerRow
                  player={player}
                  isYou={false}
                  nominatable={props.canNominate(player)}
                  onNominate={() => props.onNominate(player)}
                  formatMessage={formatMessage}
                />
              </Show>
            )}
          </For>
        </div>

        <button
          type="button"
          class={styles.endRound}
          onClick={() => props.onEndRound()}
        >
          {formatMessage('game.endRound')}
        </button>
      </div>
    </div>
  );
}
