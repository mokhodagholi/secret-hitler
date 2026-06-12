import { Show } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Icon, type IconName } from '../../components/Icon/Icon';
import styles from './GameMenu.module.scss';

export interface GameMenuProps {
  open: boolean;
  roomName: string;
  onClose: () => void;
  onViewRules: () => void;
  onLeave: () => void;
}

/**
 * Minimal in-game menu shown as a row of icon buttons: music and effects
 * mutes, the room name, the rules, and quitting. Everything else stays on the
 * main Settings screen, outside a running game.
 */
export function GameMenu(props: GameMenuProps) {
  const { i18n, settings, animation } = useApp();
  const { formatMessage } = i18n;
  const state = settings.settings;

  return (
    <Show when={props.open}>
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
          aria-label={formatMessage('settings.title')}
          ref={(element) => void animation.play(element, 'pop-in')}
        >
          <header class={styles.header}>
            <span class={styles.roomName}>{props.roomName}</span>
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
            <MenuIcon
              icon="music"
              label={formatMessage('gameMenu.music')}
              active={state.music}
              onClick={() => settings.set('music', !state.music)}
            />
            <MenuIcon
              icon="speaker"
              label={formatMessage('gameMenu.effects')}
              active={state.soundEffects}
              onClick={() => settings.set('soundEffects', !state.soundEffects)}
            />
            <MenuIcon
              icon="book"
              label={formatMessage('gameMenu.viewRules')}
              onClick={() => props.onViewRules()}
            />
            <MenuIcon
              icon="door"
              label={formatMessage('gameMenu.quit')}
              danger
              onClick={() => props.onLeave()}
            />
          </div>
        </div>
      </div>
    </Show>
  );
}

interface MenuIconProps {
  icon: IconName;
  label: string;
  /** Toggle state — when defined, an inactive icon reads as "muted". */
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
      aria-label={props.label}
      aria-pressed={props.active}
      onClick={() => props.onClick()}
    >
      <Icon name={props.icon} size={24} />
      <span class={styles.iconLabel}>{props.label}</span>
    </button>
  );
}
