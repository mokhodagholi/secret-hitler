import { Show } from 'solid-js';
import type { PublicPlayer } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { playerLabel } from '../../i18n/perspective';
import { avatarImage } from '../../assets/avatars';
import paperFrame from '../../assets/avatars/avatar_placeholder.png';
import styles from './TableSeat.module.scss';

export interface TableSeatProps {
  player: PublicPlayer;
  isYou: boolean;
  isNext: boolean;
  /** Eligible pick — sways so the President can see who to tap. */
  selectable: boolean;
  /** Previous-government lock: clickable so we can explain why not. */
  termLocked: boolean;
  bubble?: string;
  onSelect: () => void;
  formatMessage: FormatMessage;
}

/**
 * One seat at the table: the paper photo card, a coloured office cloud when
 * this player holds a public office, and an optional chat bubble.
 */
export function TableSeat(props: TableSeatProps) {
  const { formatMessage } = props;

  const office = () =>
    props.player.isPresident
      ? 'president'
      : props.player.isChancellor
        ? 'chancellor'
        : null;

  const interactive = () => props.selectable || props.termLocked;

  return (
    <button
      type="button"
      classList={{
        [styles.seat]: true,
        [styles.dead]: !props.player.isAlive,
        [styles.offline]: !props.player.connected,
        [styles.you]: props.isYou,
        [styles.selectable]: props.selectable,
        [styles.termLocked]: props.termLocked,
        [styles.voted]: props.player.hasVoted,
      }}
      aria-label={playerLabel(props.isYou, props.player.name, formatMessage)}
      data-seat-id={props.player.id}
      aria-disabled={!interactive()}
      tabIndex={interactive() ? 0 : -1}
      onClick={() => {
        if (interactive()) props.onSelect();
      }}
    >
      <Show when={props.bubble}>
        <span class={styles.bubble} dir="auto">
          {props.bubble}
        </span>
      </Show>

      <Show when={office()}>
        {(kind) => (
          <span
            classList={{
              [styles.office]: true,
              [styles.officePresident]: kind() === 'president',
              [styles.officeChancellor]: kind() === 'chancellor',
            }}
          >
            {formatMessage(`game.${kind()}`)}
          </span>
        )}
      </Show>

      <Show when={props.isNext && !props.player.isPresident && !office()}>
        <span class={styles.next}>{formatMessage('game.nextPresident')}</span>
      </Show>

      <span class={styles.paper}>
        <img class={styles.paperFrame} src={paperFrame} alt="" />
        <img
          class={styles.face}
          src={avatarImage(props.player.avatar)}
          alt=""
          aria-hidden="true"
        />
        <span class={styles.badge}>
          {formatMessage('game.seatNumber', { n: props.player.seat + 1 })}
        </span>
        <span class={styles.name} dir="auto">
          {playerLabel(props.isYou, props.player.name, formatMessage)}
        </span>
      </span>
    </button>
  );
}
