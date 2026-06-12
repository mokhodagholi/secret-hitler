import type { Role } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import styles from './RoleBanner.module.scss';

export interface RoleBannerProps {
  role: Role;
  formatMessage: FormatMessage;
}

/**
 * The viewer's own secret role, shown above the board. Placeholder text for
 * now — a role illustration will replace the inner wrapper later.
 */
export function RoleBanner(props: RoleBannerProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  return (
    <div
      classList={{
        [styles.banner]: true,
        [styles.liberal]: props.role === 'liberal',
        [styles.fascist]: props.role !== 'liberal',
      }}
      ref={(element) => void animation.play(element, 'card-flip-in')}
    >
      {/* Replace this wrapper with the role art when available. */}
      <span class={styles.art}>{formatMessage(`role.${props.role}`)}</span>
      <span class={styles.caption}>
        {formatMessage('game.youAreRole', {
          role: formatMessage(`role.${props.role}`),
        })}
      </span>
    </div>
  );
}
