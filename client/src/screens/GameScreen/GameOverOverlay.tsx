import { For } from 'solid-js';
import type { Faction, PublicPlayer } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import styles from './GameOverOverlay.module.scss';

export interface GameOverOverlayProps {
  formatMessage: FormatMessage;
  winner: Faction;
  /** Players with roles revealed (the server discloses all roles at GameOver). */
  players: PublicPlayer[];
  onLeave: () => void;
}

/** End-of-game screen: the winning faction and every player's revealed role. */
export function GameOverOverlay(props: GameOverOverlayProps) {
  const { formatMessage } = props;
  return (
    <div class={styles.backdrop}>
      <div class={styles.dialog} role="alertdialog" aria-modal="true">
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

        <ul class={styles.roles}>
          <For each={[...props.players].sort((a, b) => a.seat - b.seat)}>
            {(player) => (
              <li class={styles.roleRow}>
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

        <button type="button" class={styles.leave} onClick={() => props.onLeave()}>
          {formatMessage('game.leaveRoom')}
        </button>
      </div>
    </div>
  );
}
