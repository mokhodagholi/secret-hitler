import { Show, createEffect, on } from 'solid-js';
import type { PublicPlayer } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { playerLabel } from '../../i18n/perspective';
import { useApp } from '../../services/AppContext';
import { avatarImage } from '../../assets/avatars';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import { commitOnPress } from './commitOnPress';
import styles from './GameScreen.module.scss';

export interface PlayerRowProps {
  player: PublicPlayer;
  isYou: boolean;
  nominatable: boolean;
  /** President / Chancellor office — hidden until the opening night ends. */
  showOffice?: boolean;
  onNominate: () => void;
  formatMessage: FormatMessage;
}

/**
 * One row in the sidebar player list: avatar, name, President/Chancellor
 * office, and the role or investigated party — only when the server revealed
 * it to this viewer (own role, fellow fascists, game over, or Investigate).
 */
export function PlayerRow(props: PlayerRowProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  let rowElement: HTMLButtonElement | undefined;

  // An execution collapses the row into its greyed dead state.
  createEffect(
    on(
      () => props.player.isAlive,
      (alive, previouslyAlive) => {
        if (previouslyAlive && !alive) void animation.play(rowElement, 'seat-death');
      },
      { defer: true },
    ),
  );

  return (
    <button
      type="button"
      ref={rowElement}
      classList={{
        [styles.playerRow]: true,
        [styles.dead]: !props.player.isAlive,
        [styles.offline]: !props.player.connected,
        [styles.you]: props.isYou,
        [styles.nominatable]: props.nominatable,
        [styles.voted]: props.player.hasVoted,
      }}
      disabled={!props.nominatable}
      {...commitOnPress(() => props.onNominate())}
    >
      <span class={styles.playerAvatar}>
        <WarmImg
          class={styles.playerAvatarImage}
          src={avatarImage(props.player.avatar)}
          alt=""
          aria-hidden="true"
        />
      </span>
      <span class={styles.playerInfo}>
        <span class={styles.playerName}>
          {playerLabel(props.isYou, props.player.name, formatMessage)}
        </span>
        <span class={styles.playerMeta}>
          <Show when={props.showOffice !== false}>
            <span class={styles.playerSeat}>
              {formatMessage('game.seatNumber', { n: props.player.seat + 1 })}
            </span>
          </Show>
          <Show when={props.player.role}>
            <span
              classList={{
                [styles.playerRole]: true,
                [styles.roleLiberal]: props.player.role === 'liberal',
                [styles.roleFascist]: props.player.role !== 'liberal',
              }}
            >
              {formatMessage(`role.${props.player.role!}`)}
            </span>
          </Show>
          <Show when={!props.player.role && props.player.party}>
            {(party) => (
              <span
                classList={{
                  [styles.playerRole]: true,
                  [styles.roleLiberal]: party() === 'liberal',
                  [styles.roleFascist]: party() === 'fascist',
                }}
                data-party={party()}
              >
                {formatMessage(`game.${party()}`)}
              </span>
            )}
          </Show>
        </span>
      </span>
      <Show when={props.showOffice !== false && props.player.isPresident}>
        <span
          classList={{
            [styles.playerBadge]: true,
            [styles.playerBadgePresident]: true,
          }}
          ref={(element) => void animation.play(element, 'badge-pop')}
        >
          {formatMessage('game.president')}
        </span>
      </Show>
      <Show when={props.showOffice !== false && props.player.isChancellor}>
        <span
          classList={{
            [styles.playerBadge]: true,
            [styles.playerBadgeChancellor]: true,
          }}
          ref={(element) => void animation.play(element, 'badge-pop')}
        >
          {formatMessage('game.chancellor')}
        </span>
      </Show>
    </button>
  );
}
