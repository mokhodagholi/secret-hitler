import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import type { LogEntry } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { isolateBidi } from '../../i18n/utils';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SpeakerBar } from '../GameScreen/SpeakerBar';
import styles from './ChatScreen.module.scss';

/**
 * Full-page chat and game log, split out of the board so the game screen stays
 * focused on play. Names are bidi-isolated so a Latin nickname can't reorder an
 * RTL line.
 */
export function ChatScreen() {
  const { nav, game, i18n } = useApp();
  const { formatMessage } = i18n;

  const [activeTab, setActiveTab] = createSignal<'chat' | 'log'>('chat');
  const [chatDraft, setChatDraft] = createSignal('');
  const [now, setNow] = createSignal(Date.now());
  let feedScroller: HTMLDivElement | undefined;

  // No room → nothing to show; bounce back to the play menu.
  createEffect(() => {
    if (!game.inRoom()) nav.navigate('play');
  });

  // Clear the unread badge while the page is open, including new arrivals.
  createEffect(() => {
    game.chatMessages();
    game.markChatRead();
  });

  // Keep the feed pinned to the newest entry.
  createEffect(() => {
    game.chatMessages();
    game.logEntries();
    if (feedScroller) feedScroller.scrollTop = feedScroller.scrollHeight;
  });

  onMount(() => {
    game.markChatRead();
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => clearInterval(ticker));
  });

  const speakerSecondsLeft = () => {
    const endsAt = game.speaker()?.endsAt;
    return endsAt != null ? Math.max(0, Math.ceil((endsAt - now()) / 1000)) : null;
  };

  const timestamp = (at: number) =>
    new Date(at).toLocaleTimeString(i18n.lang(), {
      hour: '2-digit',
      minute: '2-digit',
    });

  // Isolate name-like (string) params so they don't disturb an RTL log line.
  const isolatedParams = (params: LogEntry['params']) => {
    if (!params) return params;
    const isolated: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(params)) {
      isolated[key] = typeof value === 'string' ? isolateBidi(value) : value;
    }
    return isolated;
  };

  const speakerName = () =>
    game.view()?.players.find((player) => player.id === game.speaker()?.playerId)
      ?.name ?? '';

  function sendChat(): void {
    if (game.chatLocked()) return;
    game.sendChat(chatDraft());
    setChatDraft('');
  }

  return (
    <Screen>
      <ScreenHeader title={formatMessage('game.chatTitle')} />

      <section class={styles.chatPanel}>
        <div class={styles.tabs}>
          <button
            type="button"
            classList={{
              [styles.tab]: true,
              [styles.tabActive]: activeTab() === 'chat',
            }}
            onClick={() => setActiveTab('chat')}
          >
            {formatMessage('game.chat')}
          </button>
          <button
            type="button"
            classList={{
              [styles.tab]: true,
              [styles.tabActive]: activeTab() === 'log',
            }}
            onClick={() => setActiveTab('log')}
          >
            {formatMessage('game.gameLog')}
          </button>
        </div>

        <div class={styles.feed} ref={feedScroller}>
          <Show
            when={activeTab() === 'chat'}
            fallback={
              <For each={game.logEntries()}>
                {(entry) => (
                  <p class={styles.logEntry}>
                    <span class={styles.time}>{timestamp(entry.at)}</span>
                    {formatMessage(`log.${entry.code}`, isolatedParams(entry.params))}
                  </p>
                )}
              </For>
            }
          >
            <For each={game.chatMessages()}>
              {(message) => (
                <p class={styles.chatMessage}>
                  <bdi class={styles.chatAuthor}>{message.name}</bdi>
                  <span class={styles.time}>{timestamp(message.at)}</span>
                  <bdi class={styles.chatText}>{message.text}</bdi>
                </p>
              )}
            </For>
          </Show>
        </div>

        <Show when={activeTab() === 'chat'}>
          <Show when={game.inDiscussion()}>
            <SpeakerBar
              isMine={game.isMySpeakingTurn()}
              speakerName={speakerName()}
              secondsLeft={speakerSecondsLeft()}
              onEndTurn={() => game.sendCommand({ kind: 'endTurn' })}
              formatMessage={formatMessage}
            />
          </Show>
          <div class={styles.chatComposer}>
            <textarea
              class={styles.chatInput}
              rows={1}
              value={chatDraft()}
              disabled={game.chatLocked()}
              placeholder={formatMessage(
                game.chatLocked() ? 'game.chatWaitTurn' : 'game.chatPlaceholder',
              )}
              maxlength={500}
              onInput={(event) => setChatDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter inserts a newline.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendChat();
                }
              }}
            />
            <button
              type="button"
              class={styles.chatSend}
              aria-label={formatMessage('game.send')}
              disabled={game.chatLocked() || chatDraft().trim() === ''}
              onClick={sendChat}
            >
              <Icon name="chat" size={18} />
            </button>
          </div>
        </Show>
      </section>
    </Screen>
  );
}
