import { Show } from 'solid-js';
import { avatarImage, PAPER_FRAME } from '../../assets/avatars';
import styles from './PlayerSlot.module.scss';

export interface SlotPlayer {
  name: string;
  avatar: number;
  seat: number;
  ready: boolean;
  connected: boolean;
}

export interface PlayerSlotProps {
  player?: SlotPlayer;
  awaitingLabel: string;
  /** Locale-formatted seat number (Persian digits in FA). */
  seatLabel?: string;
  /** Host tapping a guest to kick them. */
  onSelect?: () => void;
  isYou?: boolean;
  youLabel?: string;
}

/**
 * Paper portrait card for a lobby seat. Ready state is a green/red glow on
 * the card; empty seats show the frame only, grayed out.
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
          <span class={styles.paper}>
            <img class={styles.paperFrame} src={PAPER_FRAME} alt="" />
          </span>
        </div>
      }
    >
      {(player) => {
        const kickable = () => props.onSelect != null;
        const shownName = () =>
          props.isYou && props.youLabel ? props.youLabel : player().name;
        const portrait = () => (
          <span
            classList={{
              [styles.paper]: true,
              [styles.paperReady]: player().ready,
              [styles.paperNotReady]: !player().ready,
              [styles.paperYou]: !!props.isYou,
            }}
          >
            <img class={styles.paperFrame} src={PAPER_FRAME} alt="" />
            <img
              class={styles.face}
              src={avatarImage(player().avatar)}
              alt=""
              aria-hidden="true"
            />
            <span class={styles.badge}>{props.seatLabel ?? player().seat + 1}</span>
            <span class={styles.name} dir="auto">
              {shownName()}
            </span>
          </span>
        );
        return (
          <Show
            when={kickable()}
            fallback={
              <div
                classList={{
                  [styles.slot]: true,
                  [styles.offline]: !player().connected,
                }}
                role="listitem"
                aria-label={shownName()}
              >
                {portrait()}
              </div>
            }
          >
            <button
              type="button"
              role="listitem"
              aria-label={shownName()}
              classList={{
                [styles.slot]: true,
                [styles.offline]: !player().connected,
                [styles.kickable]: true,
              }}
              onClick={() => props.onSelect?.()}
            >
              {portrait()}
            </button>
          </Show>
        );
      }}
    </Show>
  );
}
