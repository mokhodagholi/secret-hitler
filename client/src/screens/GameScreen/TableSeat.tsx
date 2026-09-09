import { Show } from 'solid-js';
import type { PublicPlayer, Role } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { avatarImage } from '../../assets/avatars';
import { OFFICE_PLACARD, ROLE_FACE } from '../../assets/cards';
import paperFrame from '../../assets/avatars/avatar_placeholder.png';
import styles from './TableSeat.module.scss';

export interface TableSeatProps {
  player: PublicPlayer;
  isYou: boolean;
  secretRole?: Role | null;
  isNext: boolean;
  nominatable: boolean;
  bubble?: string;
  timerProgress?: number | null;
  onSelect: () => void;
  formatMessage: FormatMessage;
}

/**
 * One seat at the table: the paper photo card, an office banner hanging off
 * its left edge, and an optional chat bubble. The viewer's own seat also
 * shows their secret role.
 */
export function TableSeat(props: TableSeatProps) {
  const { formatMessage } = props;
  const ariaLabel = () =>
    props.isYou && props.secretRole
      ? formatMessage('game.youAreRole', {
          role: formatMessage(`role.${props.secretRole}`),
        })
      : props.player.name;

  const office = () =>
    props.player.isPresident
      ? 'president'
      : props.player.isChancellor
        ? 'chancellor'
        : null;

  return (
    <button
      type="button"
      classList={{
        [styles.seat]: true,
        [styles.dead]: !props.player.isAlive,
        [styles.offline]: !props.player.connected,
        [styles.you]: props.isYou,
        [styles.nominatable]: props.nominatable,
        [styles.voted]: props.player.hasVoted,
      }}
      aria-label={ariaLabel()}
      disabled={!props.nominatable}
      onClick={() => props.onSelect()}
    >
      <Show when={props.bubble}>
        <span class={styles.bubble} dir="auto">
          {props.bubble}
        </span>
      </Show>

      <Show when={props.isNext && !props.player.isPresident}>
        <span class={styles.next}>{formatMessage('game.nextPresident')}</span>
      </Show>

      <span class={styles.paperWrap}>
        <Show when={office()}>
          {(kind) => (
            <span class={styles.placard}>
              <img
                class={styles.placardArt}
                src={OFFICE_PLACARD[kind()]}
                alt=""
              />
              <span class={styles.placardText}>
                {formatMessage(`game.${kind()}`)}
              </span>
            </span>
          )}
        </Show>

        <span class={styles.paper}>
          <img class={styles.paperFrame} src={paperFrame} alt="" />
          <img
            class={styles.face}
            src={avatarImage(props.player.avatar)}
            alt=""
            aria-hidden="true"
          />
          <span class={styles.badge}>{props.player.seat + 1}</span>
          <span class={styles.name} dir="auto">
            {props.player.name}
          </span>
        </span>
      </span>

      <Show when={props.isYou && props.secretRole}>
        {(role) => (
          <span class={styles.youRole}>
            <img
              class={styles.youRoleCard}
              src={ROLE_FACE[role()]}
              alt=""
            />
            {formatMessage('game.youAreRole', {
              role: formatMessage(`role.${role()}`),
            })}
          </span>
        )}
      </Show>

      <Show when={props.timerProgress != null}>
        <span class={styles.timerTrack} aria-hidden="true">
          <span
            class={styles.timerFill}
            style={{ width: `${Math.round((props.timerProgress ?? 0) * 100)}%` }}
          />
        </span>
      </Show>
    </button>
  );
}
