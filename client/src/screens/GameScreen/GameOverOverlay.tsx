import { For, Show } from 'solid-js';
import type { Faction, PublicPlayer } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import styles from './GameOverOverlay.module.scss';

/** Stagger between role reveals — the "I knew it!" cascade. */
const CASCADE_STEP_MS = 140;
const CASCADE_START_MS = 350;

export interface GameOverOverlayProps {
  formatMessage: FormatMessage;
  winner: Faction;
  /** Players with roles revealed (the server discloses all roles at GameOver). */
  players: PublicPlayer[];
  /** Roles wait until Ravi's "the roles are revealed" line. */
  showRoles: boolean;
  onLeave: () => void;
}

/** End-of-game screen: the winning faction, then every player's revealed role. */
export function GameOverOverlay(props: GameOverOverlayProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <div
        class={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        ref={(element) => void animation.play(element, 'pop-in')}
      >
        <span
          classList={{
            [styles.headline]: true,
            [styles.liberal]: props.winner === 'liberal',
            [styles.fascist]: props.winner === 'fascist',
          }}
        >
          {formatMessage(
            props.winner === 'liberal'
              ? 'game.over.liberalsWin'
              : 'game.over.fascistsWin',
          )}
        </span>

        <Show when={props.showRoles}>
          <ul class={styles.roles}>
            <For each={[...props.players].sort((a, b) => a.seat - b.seat)}>
              {(player, index) => (
                <li
                  class={styles.roleRow}
                  ref={(element) =>
                    void animation.play(element, 'card-flip-in', {
                      delay: CASCADE_START_MS + index() * CASCADE_STEP_MS,
                      fill: 'backwards',
                    })
                  }
                >
                  <span class={styles.name}>{player.name}</span>
                  <span
                    classList={{
                      [styles.role]: true,
                      [styles.roleLiberal]: player.role === 'liberal',
                      [styles.roleFascist]: player.role !== 'liberal',
                    }}
                  >
                    {player.role ? formatMessage(`role.${player.role}`) : '—'}
                  </span>
                </li>
              )}
            </For>
          </ul>
        </Show>

        <button type="button" class={styles.leave} onClick={() => props.onLeave()}>
          {formatMessage('game.leaveRoom')}
        </button>
      </div>
    </div>
  );
}
