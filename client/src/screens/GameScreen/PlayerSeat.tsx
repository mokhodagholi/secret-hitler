import { Show, createEffect, on } from 'solid-js';
import type { PublicPlayer } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import styles from './GameScreen.module.scss';

export interface PlayerSeatProps {
  player: PublicPlayer;
  /** Seat centre, in % of the table box. */
  x: number;
  y: number;
  isYou: boolean;
  speaking: boolean;
  nominatable: boolean;
  onNominate: () => void;
  formatMessage: FormatMessage;
}

/** One avatar around the oval table: initial, name, badges and role label. */
export function PlayerSeat(props: PlayerSeatProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  let seatElement: HTMLButtonElement | undefined;

  // An execution collapses the seat into its greyed dead state.
  createEffect(
    on(
      () => props.player.isAlive,
      (alive, previouslyAlive) => {
        if (previouslyAlive && !alive) void animation.play(seatElement, 'seat-death');
      },
      { defer: true },
    ),
  );

  return (
    <button
      type="button"
      ref={seatElement}
      classList={{
        [styles.seat]: true,
        [styles.dead]: !props.player.isAlive,
        [styles.offline]: !props.player.connected,
        [styles.you]: props.isYou,
        [styles.speaking]: props.speaking,
        [styles.nominatable]: props.nominatable,
        [styles.voted]: props.player.hasVoted,
      }}
      style={{ left: `${props.x}%`, top: `${props.y}%` }}
      disabled={!props.nominatable}
      onClick={() => props.onNominate()}
    >
      <span class={styles.seatAvatar}>
        {props.player.name.slice(0, 1).toUpperCase()}
        <Show when={props.player.isPresident}>
          <span
            class={styles.seatBadge}
            ref={(element) => void animation.play(element, 'badge-pop')}
          >
            P
          </span>
        </Show>
        <Show when={props.player.isChancellor}>
          <span
            class={styles.seatBadge}
            ref={(element) => void animation.play(element, 'badge-pop')}
          >
            C
          </span>
        </Show>
      </span>
      <span class={styles.seatName}>{props.player.name}</span>
      <Show when={props.player.role}>
        <span
          classList={{
            [styles.seatRole]: true,
            [styles.roleLiberal]: props.player.role === 'liberal',
            [styles.roleFascist]: props.player.role !== 'liberal',
          }}
        >
          {formatMessage(`role.${props.player.role!}`)}
        </span>
      </Show>
    </button>
  );
}
