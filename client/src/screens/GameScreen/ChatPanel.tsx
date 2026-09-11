import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { useApp } from '../../services/AppContext';
import { playerLabel } from '../../i18n/perspective';
import { avatarImage } from '../../assets/avatars';
import { Icon } from '../../components/Icon/Icon';
import { nativeFieldAttrs } from '../../components/nativeField';
import styles from './ChatPanel.module.scss';

/** Handle + chrome only — feed and composer hide at this height. */
const CHAT_MIN = 72;
const CHAT_DEFAULT = 280;
/** Leave room for the event header, deck, and a full-size seat row. */
const BOARD_RESERVE = 260;
const HEIGHT_KEY = 'sh:chat-panel-height';

export interface ChatPanelProps {
  talkingAllowed?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onOpenPlayers: () => void;
  onOpenMenu: () => void;
  onHeightChange?: (height: number) => void;
}

/**
 * Docked table chat: stays on the board, resizes by dragging the top handle,
 * and keeps people/settings in its chrome so the scene never leaves play.
 */
export function ChatPanel(props: ChatPanelProps) {
  const { game, i18n, flags, voice } = useApp();
  const { formatMessage } = i18n;

  const [chatDraft, setChatDraft] = createSignal('');
  const [height, setHeight] = createSignal(CHAT_DEFAULT);
  const [resizing, setResizing] = createSignal(false);
  const [now, setNow] = createSignal(Date.now());
  let panelEl: HTMLElement | undefined;
  let feedScroller: HTMLDivElement | undefined;
  let inputEl: HTMLTextAreaElement | undefined;
  let dragStartY = 0;
  let dragStartHeight = CHAT_DEFAULT;
  let lastExpanded = CHAT_DEFAULT;
  let dragging = false;

  const talkingAllowed = () => props.talkingAllowed !== false;
  const canSend = () => talkingAllowed() && chatDraft().trim() !== '';
  const expanded = () => height() > CHAT_MIN + 16;

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

  createEffect(() => {
    game.chatMessages();
    game.unreadChat();
    if (expanded()) game.markChatRead();
  });

  createEffect(() => {
    game.chatMessages();
    if (feedScroller) feedScroller.scrollTop = feedScroller.scrollHeight;
  });

  const autosizeInput = () => {
    const el = inputEl;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${el.scrollHeight}px`;
  };

  createEffect(() => {
    chatDraft();
    queueMicrotask(autosizeInput);
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
    if (endsAt == null) return null;
    const clock = game.view()?.kickVote?.startedAt ?? now();
    return Math.max(0, Math.ceil((endsAt - clock) / 1000));
  };

  const timestamp = (at: number) =>
    new Date(at).toLocaleTimeString(i18n.lang(), {
      hour: '2-digit',
      minute: '2-digit',
    });

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
          <Show when={props.actionLabel}>
            <Show
              when={props.onAction}
              fallback={
                <span class={styles.title}>{props.actionLabel}</span>
              }
            >
              <button
                type="button"
                class={styles.tableAction}
                onClick={props.onAction}
              >
                {props.actionLabel}
              </button>
            </Show>
          </Show>
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
          <Show when={flags.enabled('voice')}>
            <button
              type="button"
              classList={{
                [styles.tool]: true,
                [styles.toolMuted]: voice.selfMuted(),
              }}
              aria-label={formatMessage(
                voice.selfMuted() ? 'game.unmuteSelf' : 'game.muteSelf',
              )}
              aria-pressed={!voice.selfMuted()}
              onClick={() => voice.toggleSelfMute()}
            >
              <Icon name={voice.selfMuted() ? 'micOff' : 'mic'} size={20} />
            </button>
          </Show>
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

      <Show when={expanded()}>
        <div class={styles.feed} ref={feedScroller}>
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
                    <time
                      class={styles.stamp}
                      datetime={new Date(message.at).toISOString()}
                    >
                      {timestamp(message.at)}
                    </time>
                  </div>
                </article>
              );
            }}
          </For>
        </div>

        <div
          classList={{
            [styles.composer]: true,
            [styles.composerMuted]: !talkingAllowed(),
          }}
        >
          <textarea
            class={styles.input}
            rows={1}
            dir={i18n.dir()}
            value={chatDraft()}
            placeholder={
              talkingAllowed()
                ? formatMessage('game.chatPlaceholder')
                : formatMessage('game.chatSilentPlaceholder')
            }
            maxlength={500}
            disabled={!talkingAllowed()}
            aria-disabled={!talkingAllowed()}
            {...nativeFieldAttrs({ enterKeyHint: 'send' })}
            ref={(element) => {
              inputEl = element;
              queueMicrotask(autosizeInput);
            }}
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
            class={styles.send}
            aria-label={formatMessage('game.send')}
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
