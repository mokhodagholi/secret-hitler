import { Show } from 'solid-js';
import playerPlaceholder from '../../assets/lobby/player-placeholder.png';
import styles from './PlayerSlot.module.scss';

export interface SlotPlayer {
  name: string;
  ready: boolean;
  connected: boolean;
}

export interface PlayerSlotProps {
  player?: SlotPlayer;
  awaitingLabel: string;
  /** Host tapping a guest to kick them. */
  onSelect?: () => void;
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
      {(player) => {
        const kickable = () => props.onSelect != null;
        return (
          <button
            type="button"
            role="listitem"
            aria-label={player().name}
            disabled={!kickable()}
            classList={{
              [styles.slot]: true,
              [styles.offline]: !player().connected,
              [styles.kickable]: kickable(),
            }}
            onClick={() => props.onSelect?.()}
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
            <span class={styles.name} dir="auto">
              {player().name}
            </span>
          </button>
        );
      }}
    </Show>
  );
}
