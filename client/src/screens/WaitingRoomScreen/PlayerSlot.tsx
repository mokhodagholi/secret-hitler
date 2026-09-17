import { Show } from 'solid-js';
import { avatarImage, PAPER_FRAME } from '../../assets/avatars';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import styles from './PlayerSlot.module.scss';

export interface SlotPlayer {
  name: string;
  avatar: number;
  seat: number;
  ready: boolean;
  wantsStart?: boolean;
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
  /** Fill the parent — the unready-kick dialog, not the lobby grid. */
  compact?: boolean;
}

/**
 * Lobby seat portrait with the seat number on the left of the name.
 * Ready state is a green/red glow; empty seats show the unused paper
 * slot, grayed out.
 */
export function PlayerSlot(props: PlayerSlotProps) {
  return (
    <Show
      when={props.player}
      keyed={false}
      fallback={
        <div
          classList={{
            [styles.slot]: true,
            [styles.empty]: true,
            [styles.compact]: !!props.compact,
          }}
          role="listitem"
          aria-label={props.awaitingLabel}
        >
          <span class={styles.paper}>
            <WarmImg class={styles.paperFrame} src={PAPER_FRAME} alt="" />
          </span>
        </div>
      }
    >
      {(player) => {
        const kickable = () => props.onSelect != null;
        const shownName = () =>
          props.isYou && props.youLabel ? props.youLabel : player().name;
        const portrait = () => (
          <>
            <span
              classList={{
                [styles.paper]: true,
                [styles.paperReady]: player().ready,
                [styles.paperNotReady]: !player().ready,
                [styles.paperWantsStart]: !!player().wantsStart,
                [styles.paperYou]: !!props.isYou,
              }}
            >
              <WarmImg
                class={styles.face}
                src={avatarImage(player().avatar)}
                alt=""
                aria-hidden="true"
              />
            </span>
            <span class={styles.caption} dir="ltr">
              <span class={styles.badge} dir="auto">
                {props.seatLabel ?? player().seat + 1}
              </span>
              <span class={styles.name} dir="auto">
                {shownName()}
              </span>
            </span>
          </>
        );
        return (
          <Show
            when={kickable()}
            fallback={
              <div
                classList={{
                  [styles.slot]: true,
                  [styles.compact]: !!props.compact,
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
                [styles.compact]: !!props.compact,
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
