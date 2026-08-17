import { Show } from 'solid-js';
import playerPlaceholder from '../../assets/images/lobby/player_placeholder.png';
import styles from './PlayerSlot.module.scss';

export interface SlotPlayer {
  name: string;
  ready: boolean;
  connected: boolean;
}

export interface PlayerSlotProps {
  player?: SlotPlayer;
  awaitingLabel: string;
}

/**
 * Compact portrait seat. Ready state is the ring color; empty seats reuse the
 * same portrait, grayed out.
 */
export function PlayerSlot(props: PlayerSlotProps) {
  return (
    <Show
      when={props.player}
      fallback={
        <div
          class={`${styles.slot} ${styles.empty}`}
          role="listitem"
          aria-label={props.awaitingLabel}
        >
          <div class={`${styles.avatar} ${styles.avatarEmpty}`}>
            <img class={styles.avatarImage} src={playerPlaceholder} alt="" />
          </div>
        </div>
      }
    >
      {(player) => (
        <div
          role="listitem"
          aria-label={player().name}
          classList={{ [styles.slot]: true, [styles.offline]: !player().connected }}
        >
          <div
            classList={{
              [styles.avatar]: true,
              [styles.avatarReady]: player().ready,
              [styles.avatarNotReady]: !player().ready,
            }}
          >
            <img class={styles.avatarImage} src={playerPlaceholder} alt="" />
          </div>
        </div>
      )}
    </Show>
  );
}
