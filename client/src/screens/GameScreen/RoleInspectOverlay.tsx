import { onCleanup, onMount } from 'solid-js';
import type { Role } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { ROLE_FACE } from '../../assets/cards';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import styles from './RoleInspectOverlay.module.scss';

export interface RoleInspectOverlayProps {
  role: Role;
  onClose: () => void;
}

/**
 * Full-size look at your secret role. The blank band on the card holds the
 * role name and what that role is trying to do.
 */
export function RoleInspectOverlay(props: RoleInspectOverlayProps) {
  const { i18n, animation } = useApp();
  const { formatMessage } = i18n;

  onMount(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  return (
    <div
      class={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={formatMessage('game.yourRole')}
      onClick={props.onClose}
    >
      <div
        class={styles.card}
        onClick={(event) => event.stopPropagation()}
        ref={(element) => void animation.play(element, 'pop-in')}
      >
        <WarmImg
          class={styles.art}
          src={ROLE_FACE[props.role]}
          alt={formatMessage(`role.${props.role}`)}
        />
        <div class={styles.caption}>
          <span class={styles.name}>{formatMessage(`role.${props.role}`)}</span>
          <span class={styles.blurb} dir="auto">
            {formatMessage(`roleDescription.${props.role}`)}
          </span>
        </div>
      </div>
    </div>
  );
}
