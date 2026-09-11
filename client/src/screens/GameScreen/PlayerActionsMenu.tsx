import { Show } from 'solid-js';
import type { PublicPlayer } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { isolateBidi } from '../../i18n/utils';
import { useApp } from '../../services/AppContext';
import { Icon, type IconName } from '../../components/Icon/Icon';
import styles from './PlayerActionsMenu.module.scss';

export interface PlayerActionsMenuProps {
  player: PublicPlayer;
  canReport: boolean;
  canMute: boolean;
  muted: boolean;
  formatMessage: FormatMessage;
  onReport: () => void;
  onMute: () => void;
  onClose: () => void;
}

/**
 * Seat / roster tap sheet: report (kick vote) and local mute-other.
 * Mute-other never leaves this browser.
 */
export function PlayerActionsMenu(props: PlayerActionsMenuProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  const name = () => isolateBidi(props.player.name);

  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
      onClick={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
    >
      <div
        class={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={name()}
        ref={(element) => void animation.play(element, 'pop-in')}
      >
        <header class={styles.header}>
          <span class={styles.playerName} dir="auto">
            {name()}
          </span>
          <button
            type="button"
            class={styles.close}
            aria-label={formatMessage('common.goBack')}
            onClick={() => props.onClose()}
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div class={styles.actions}>
          <Show when={props.canMute}>
            <MenuIcon
              icon={props.muted ? 'micOff' : 'mic'}
              label={formatMessage(
                props.muted ? 'game.playerMenu.unmute' : 'game.playerMenu.mute',
              )}
              ariaLabel={formatMessage(
                props.muted ? 'game.unmutePlayer' : 'game.mutePlayer',
                { name: props.player.name },
              )}
              active={!props.muted}
              onClick={() => props.onMute()}
            />
          </Show>
          <Show when={props.canReport}>
            <MenuIcon
              icon="skull"
              label={formatMessage('game.playerMenu.report')}
              danger
              onClick={() => props.onReport()}
            />
          </Show>
        </div>
      </div>
    </div>
  );
}

interface MenuIconProps {
  icon: IconName;
  label: string;
  ariaLabel?: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}

function MenuIcon(props: MenuIconProps) {
  return (
    <button
      type="button"
      classList={{
        [styles.iconButton]: true,
        [styles.muted]: props.active === false,
        [styles.danger]: props.danger,
      }}
      aria-label={props.ariaLabel ?? props.label}
      aria-pressed={props.active}
      onClick={() => props.onClick()}
    >
      <Icon name={props.icon} size={24} />
      <span class={styles.iconLabel}>{props.label}</span>
    </button>
  );
}
