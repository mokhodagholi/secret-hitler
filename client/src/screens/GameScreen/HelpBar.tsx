import { For, Show, createSignal } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import { Icon } from '../../components/Icon/Icon';
import styles from './HelpBar.module.scss';

export interface HelpBarProps {
  unreadChat: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onOpenChat: () => void;
  onOpenPlayers: () => void;
  onOpenMenu: () => void;
  onRaiseHand: () => void;
  onEmoji: (emoji: string) => void;
  formatMessage: FormatMessage;
}

const QUICK_EMOJIS = ['👍', '👎', '😂', '😱', '🤔', '✋'];

/**
 * Table tools: chat, hand, emoji, players, and settings. Phase instructions
 * live in the top header, not here.
 */
export function HelpBar(props: HelpBarProps) {
  const { formatMessage } = props;
  const [emojiOpen, setEmojiOpen] = createSignal(false);

  function pickEmoji(emoji: string): void {
    props.onEmoji(emoji);
    setEmojiOpen(false);
  }

  return (
    <footer class={styles.bar}>
      <Show when={props.actionLabel && props.onAction}>
        <button type="button" class={styles.action} onClick={props.onAction}>
          {props.actionLabel}
        </button>
      </Show>
      <div class={styles.tools}>
        <button
          type="button"
          class={styles.tool}
          aria-label={formatMessage('game.openChat')}
          onClick={props.onOpenChat}
        >
          <Icon name="chat" size={18} />
          <Show when={props.unreadChat}>
            <span class={styles.badge} />
          </Show>
        </button>
        <button
          type="button"
          class={styles.tool}
          aria-label={formatMessage('game.raiseHand')}
          onClick={props.onRaiseHand}
        >
          <Icon name="hand" size={18} />
        </button>
        <div class={styles.emojiWrap}>
          <button
            type="button"
            class={styles.tool}
            aria-label={formatMessage('game.emojis')}
            aria-expanded={emojiOpen()}
            onClick={() => setEmojiOpen((open) => !open)}
          >
            <Icon name="smile" size={18} />
          </button>
          <Show when={emojiOpen()}>
            <div class={styles.emojiTray} role="listbox">
              <For each={QUICK_EMOJIS}>
                {(emoji) => (
                  <button
                    type="button"
                    class={styles.emoji}
                    onClick={() => pickEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
        <button
          type="button"
          class={styles.tool}
          aria-label={formatMessage('game.playersTitle')}
          onClick={props.onOpenPlayers}
        >
          <Icon name="people" size={18} />
        </button>
        <button
          type="button"
          class={styles.tool}
          aria-label={formatMessage('settings.title')}
          onClick={props.onOpenMenu}
        >
          <Icon name="gear" size={18} />
        </button>
      </div>
    </footer>
  );
}
