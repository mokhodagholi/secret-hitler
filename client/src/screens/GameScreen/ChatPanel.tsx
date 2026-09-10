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
import { logLineKey, playerLabel } from '../../i18n/perspective';
import { avatarImage } from '../../assets/avatars';
import { Icon } from '../../components/Icon/Icon';
import styles from './ChatPanel.module.scss';

const CHAT_MIN = 148;
const CHAT_DEFAULT = 280;
const BOARD_RESERVE = 188;
const HEIGHT_KEY = 'sh:chat-panel-height';

export interface ChatPanelProps {
  talkingAllowed?: boolean;
  onOpenPlayers: () => void;
  onOpenMenu: () => void;
  onHeightChange?: (height: number) => void;
}

/**
 * Docked table chat: stays on the board, resizes by dragging the top handle,
 * and keeps people/settings in its chrome so the scene never leaves play.
 */
export function ChatPanel(props: ChatPanelProps) {
  const { game, i18n } = useApp();
  const { formatMessage } = i18n;

  const [activeTab, setActiveTab] = createSignal<'chat' | 'log'>('chat');
  const [chatDraft, setChatDraft] = createSignal('');
  const [height, setHeight] = createSignal(CHAT_DEFAULT);
  const [resizing, setResizing] = createSignal(false);
  const [now, setNow] = createSignal(Date.now());
  let panelEl: HTMLElement | undefined;
  let feedScroller: HTMLDivElement | undefined;
  let dragStartY = 0;
  let dragStartHeight = CHAT_DEFAULT;
  let lastExpanded = CHAT_DEFAULT;
  let dragging = false;

  const talkingAllowed = () => props.talkingAllowed !== false;
  const canSend = () => talkingAllowed() && chatDraft().trim() !== '';

  const clampHeight = (next: number) => {
    const available = panelEl?.parentElement?.clientHeight ?? 0;
    const max =
      available > BOARD_RESERVE
        ? Math.max(CHAT_MIN, available - BOARD_RESERVE)
        : 560;
    return Math.round(Math.min(max, Math.max(CHAT_MIN, next)));
  };

  const applyHeight = (next: number, persist = false) => {
    const clamped = clampHeight(next);
    setHeight(clamped);
    if (clamped > CHAT_MIN + 24) lastExpanded = clamped;
    if (persist) {
      try {
        localStorage.setItem(HEIGHT_KEY, String(clamped));
      } catch {
        /* private mode */
      }
    }
  };

  createEffect(() => props.onHeightChange?.(height()));

  const feedVisible = () => height() > CHAT_MIN + 20;

  createEffect(() => {
    game.chatMessages();
    game.unreadChat();
    if (feedVisible()) game.markChatRead();
  });

  createEffect(() => {
    game.chatMessages();
    game.logEntries();
    if (feedScroller) feedScroller.scrollTop = feedScroller.scrollHeight;
  });

  onMount(() => {
    game.markChatRead();
    try {
      const stored = Number(localStorage.getItem(HEIGHT_KEY));
      if (Number.isFinite(stored) && stored > 0) applyHeight(stored);
    } catch {
      applyHeight(height());
    }
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    const onWinResize = () => applyHeight(height(), true);
    window.addEventListener('resize', onWinResize);
    onCleanup(() => {
      clearInterval(ticker);
      window.removeEventListener('resize', onWinResize);
    });
  });

  const discussionSecondsLeft = () => {
    const endsAt = game.discussionDeadline()?.endsAt;
    return endsAt != null ? Math.max(0, Math.ceil((endsAt - now()) / 1000)) : null;
  };

  const timestamp = (at: number) =>
    new Date(at).toLocaleTimeString(i18n.lang(), {
      hour: '2-digit',
      minute: '2-digit',
    });

  const isolatedParams = (params: LogEntry['params']) => {
    if (!params) return params;
    const isolated: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(params)) {
      isolated[key] = typeof value === 'string' ? isolateBidi(value) : value;
    }
    return isolated;
  };

  const playerById = (playerId: string) =>
    game.view()?.players.find((player) => player.id === playerId);

  function sendChat(): void {
    if (!talkingAllowed() || !canSend()) return;
    game.sendChat(chatDraft());
    setChatDraft('');
  }

  function onResizePointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragging = true;
    setResizing(true);
    dragStartY = event.clientY;
    dragStartHeight = height();
  }

  function onResizePointerMove(event: PointerEvent): void {
    if (!dragging) return;
    applyHeight(dragStartHeight + (dragStartY - event.clientY));
  }

  function onResizePointerUp(): void {
    if (!dragging) return;
    dragging = false;
    setResizing(false);
    applyHeight(height(), true);
  }

  function onResizeToggle(): void {
    if (height() > CHAT_MIN + 32) {
      applyHeight(CHAT_MIN, true);
      return;
    }
    applyHeight(lastExpanded, true);
  }

  return (
    <section
      classList={{ [styles.panel]: true, [styles.resizing]: resizing() }}
      style={{ height: `${height()}px` }}
      aria-label={formatMessage('game.chat')}
      ref={(element) => (panelEl = element)}
    >
      <div
        class={styles.handle}
        role="separator"
        aria-orientation="horizontal"
        aria-label={formatMessage('game.resizeChat')}
        aria-valuemin={CHAT_MIN}
        aria-valuemax={720}
        aria-valuenow={height()}
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
        onLostPointerCapture={onResizePointerUp}
        onDblClick={onResizeToggle}
      >
        <span class={styles.grip} />
      </div>

      <header class={styles.chrome}>
        <div class={styles.titleBlock}>
          <span class={styles.titleIcon} aria-hidden="true">
            <Icon name="chat" size={22} />
          </span>
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
          <Show when={talkingAllowed() && game.inDiscussion() && discussionSecondsLeft() != null}>
            <span
              classList={{
                [styles.timer]: true,
                [styles.urgent]: (discussionSecondsLeft() ?? 0) <= 10,
              }}
            >
              <Icon name="clock" size={13} />
              {formatMessage('game.discussionLeft', {
                time: formatClock(discussionSecondsLeft()!),
              })}
            </span>
          </Show>
        </div>

        <div class={styles.tools}>
          <button
            type="button"
            class={styles.tool}
            aria-label={formatMessage('game.playersTitle')}
            onClick={props.onOpenPlayers}
          >
            <Icon name="people" size={20} />
          </button>
          <span class={styles.toolDivider} aria-hidden="true" />
          <button
            type="button"
            class={styles.tool}
            aria-label={formatMessage('settings.title')}
            onClick={props.onOpenMenu}
          >
            <Icon name="gear" size={20} />
          </button>
        </div>
      </header>

      <div class={styles.feed} ref={feedScroller}>
        <Show
          when={activeTab() === 'chat'}
          fallback={
            <For each={game.logEntries()}>
              {(entry) => (
                <p class={styles.logEntry}>
                  <span class={styles.time}>{timestamp(entry.at)}</span>
                  {formatMessage(
                    logLineKey(entry.code, entry.params, game.you()?.name ?? ''),
                    isolatedParams(entry.params),
                  )}
                </p>
              )}
            </For>
          }
        >
          <For each={game.chatMessages()}>
            {(message) => {
              const mine = () => message.playerId === game.view()?.you.id;
              const player = () => playerById(message.playerId);
              return (
                <article
                  classList={{
                    [styles.row]: true,
                    [styles.mine]: mine(),
                  }}
                >
                  <span class={styles.avatar}>
                    <Show
                      when={player()}
                      fallback={<Icon name="people" size={18} />}
                    >
                      {(seated) => (
                        <img src={avatarImage(seated().avatar)} alt="" />
                      )}
                    </Show>
                  </span>
                  <div class={styles.bubble}>
                    <bdi class={styles.author}>
                      {playerLabel(mine(), message.name, formatMessage)}
                    </bdi>
                    <bdi class={styles.text}>{message.text}</bdi>
                    <time class={styles.stamp} datetime={new Date(message.at).toISOString()}>
                      {timestamp(message.at)}
                    </time>
                  </div>
                </article>
              );
            }}
          </For>
        </Show>
      </div>

      <Show when={activeTab() === 'chat'}>
        <div
          classList={{
            [styles.composer]: true,
            [styles.hasSend]: canSend(),
            [styles.composerMuted]: !talkingAllowed(),
          }}
          dir="ltr"
        >
          <textarea
            class={styles.input}
            rows={1}
            dir="auto"
            value={chatDraft()}
            placeholder={
              talkingAllowed()
                ? formatMessage('game.chatPlaceholder')
                : formatMessage('game.chatSilentPlaceholder')
            }
            maxlength={500}
            disabled={!talkingAllowed()}
            aria-disabled={!talkingAllowed()}
            onInput={(event) => {
              if (!talkingAllowed()) return;
              setChatDraft(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendChat();
              }
            }}
          />
          <button
            type="button"
            classList={{
              [styles.send]: true,
              [styles.sendVisible]: canSend(),
            }}
            aria-label={formatMessage('game.send')}
            aria-hidden={!canSend()}
            tabindex={canSend() ? 0 : -1}
            disabled={!canSend()}
            onClick={sendChat}
          >
            <Icon name="send" size={20} />
          </button>
        </div>
      </Show>
    </section>
  );
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
