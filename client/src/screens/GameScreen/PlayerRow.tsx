import { Show, createEffect, on } from 'solid-js';
import type { PublicPlayer } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { playerLabel } from '../../i18n/perspective';
import { useApp } from '../../services/AppContext';
import { avatarImage } from '../../assets/avatars';
import styles from './GameScreen.module.scss';

export interface PlayerRowProps {
  player: PublicPlayer;
  isYou: boolean;
  nominatable: boolean;
  onNominate: () => void;
  formatMessage: FormatMessage;
}

/**
 * One row in the sidebar player list: avatar, name, President/Chancellor
 * badges, and the role label — only when the server revealed it to this
 * viewer (own role, fellow fascists, game over).
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
      onClick={() => props.onNominate()}
    >
      <span class={styles.playerAvatar}>
        <img
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
      </span>
      <Show when={props.player.isPresident}>
        <span
          class={styles.playerBadge}
          ref={(element) => void animation.play(element, 'badge-pop')}
        >
          {formatMessage('game.president').slice(0, 1)}
        </span>
      </Show>
      <Show when={props.player.isChancellor}>
        <span
          class={styles.playerBadge}
          ref={(element) => void animation.play(element, 'badge-pop')}
        >
          {formatMessage('game.chancellor').slice(0, 1)}
        </span>
      </Show>
    </button>
  );
}
