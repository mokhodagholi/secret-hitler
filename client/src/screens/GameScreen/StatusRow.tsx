import { Show } from 'solid-js';
import type { Role } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import styles from './StatusRow.module.scss';

export interface StatusRowProps {
  role: Role;
  playerCount: number;
  maxPlayers: number;
  /** Active phase countdown in seconds, or null when nothing is timed. */
  secondsLeft: number | null;
  onOpenPlayers: () => void;
  formatMessage: FormatMessage;
}

/**
 * Compact one-line header: your secret role, the player count (tap to open the
 * list) and the active countdown — kept short so the board and chat stay in
 * view together.
 */
export function StatusRow(props: StatusRowProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  const urgent = () => props.secondsLeft != null && props.secondsLeft <= 4;

  return (
    <div class={styles.row}>
      <div
        classList={{
          [styles.role]: true,
          [styles.liberal]: props.role === 'liberal',
          [styles.fascist]: props.role !== 'liberal',
        }}
        aria-label={formatMessage('game.youAreRole', {
          role: formatMessage(`role.${props.role}`),
        })}
      >
        <Icon name="masks" size={15} />
        <span class={styles.roleName}>{formatMessage(`role.${props.role}`)}</span>
      </div>

      <button
        type="button"
        class={styles.players}
        aria-label={formatMessage('game.playersTitle')}
        onClick={() => props.onOpenPlayers()}
      >
        <Icon name="people" size={15} />
        <span>
          {formatMessage('waiting.playerCount', {
            count: props.playerCount,
            max: props.maxPlayers,
          })}
        </span>
      </button>

      <div
        classList={{
          [styles.timer]: true,
          [styles.urgent]: urgent(),
          [styles.pulse]: urgent() && animation.motionEnabled(),
        }}
      >
        <Icon name="clock" size={15} />
        <span>
          <Show when={props.secondsLeft != null} fallback="—">
            {formatMessage('game.secondsLeft', { seconds: props.secondsLeft! })}
          </Show>
        </span>
      </div>
    </div>
  );
}
