import { Show } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { SettingRow } from '../../components/SettingRow/SettingRow';
import styles from './GameMenu.module.scss';

export interface GameMenuProps {
  open: boolean;
  roomName: string;
  onClose: () => void;
  onViewRules: () => void;
  onLeave: () => void;
}

/**
 * Minimal in-game settings sheet: room info, audio mutes and language only —
 * everything else stays on the main Settings screen, outside a running game.
 */
export function GameMenu(props: GameMenuProps) {
  const { i18n, settings, animation } = useApp();
  const { formatMessage } = i18n;
  const state = settings.settings;

  const activeLanguageName = () =>
    i18n.available().find((language) => language.code === state.language)!
      .nativeName;

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
            <span class={styles.title}>{formatMessage('settings.title')}</span>
            <button
              type="button"
              class={styles.close}
              aria-label={formatMessage('common.goBack')}
              onClick={() => props.onClose()}
            >
              <Icon name="close" size={20} />
            </button>
          </header>

          <div class={styles.body}>
            <SectionTitle>{formatMessage('gameMenu.roomInfo')}</SectionTitle>
            <SettingRow
              kind="value"
              icon="capitol"
              label={formatMessage('waiting.roomName')}
              value={props.roomName}
            />
            <SettingRow
              kind="link"
              icon="book"
              label={formatMessage('game.viewRules')}
              onClick={() => props.onViewRules()}
            />
            <button type="button" class={styles.leave} onClick={() => props.onLeave()}>
              <Icon name="door" size={22} class={styles.leaveIcon} />
              <span>{formatMessage('game.leaveRoom')}</span>
            </button>

            <SectionTitle>{formatMessage('gameMenu.audio')}</SectionTitle>
            <SettingRow
              kind="toggle"
              icon="music"
              label={formatMessage('gameMenu.muteMusic')}
              checked={!state.music}
              onChange={(muted) => settings.set('music', !muted)}
            />
            <SettingRow
              kind="toggle"
              icon="speaker"
              label={formatMessage('gameMenu.muteEffects')}
              checked={!state.soundEffects}
              onChange={(muted) => settings.set('soundEffects', !muted)}
            />

            <SectionTitle>{formatMessage('settings.other')}</SectionTitle>
            <SettingRow
              kind="value"
              icon="globe"
              label={formatMessage('settings.language')}
              value={activeLanguageName()}
              onClick={() => settings.set('language', i18n.next(state.language))}
            />
          </div>
        </div>
      </div>
    </Show>
  );
}
