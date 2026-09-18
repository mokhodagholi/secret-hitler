import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { Phase } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { playerLabel } from '../../i18n/perspective';
import { avatarImage } from '../../assets/avatars';
import { Icon } from '../../components/Icon/Icon';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import { nativeFieldAttrs } from '../../components/nativeField';
import { growComposerHeight } from '../../services/KeyboardService';
import { isChatNearBottom, scrollChatToBottom, stickAfterFeedScroll } from '../chatScroll';
import { commitOnPress } from './commitOnPress';
import styles from './ChatPanel.module.scss';

/** Handle + chrome only — feed and composer hide at this height. */
const CHAT_MIN = 96;
/** Handle + chrome + composer; the feed collapses to no height. */
const CHAT_COMPOSER = 164;
const CHAT_DEFAULT = 280;
/** Leave room for the event header, deck, and a full-size seat row. */
const BOARD_RESERVE = 260;
const HEIGHT_KEY = 'sh:chat-panel-height';
/** Extra slack so a slightly-short drag still counts as the composer step. */
const COMPOSER_SNAP_SLACK = 36;

export interface ChatPanelProps {
  talkingAllowed?: boolean;
  /** Hide the textarea and send — dead spectators still read the feed. */
  composerEnabled?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onOpenPlayers: () => void;
  onOpenHistory: () => void;
  /** Local admin `/play-game` — skip the open clock / breath. */
  onSkipTimer?: () => void;
  onOpenMenu: () => void;
  onHeightChange?: (height: number) => void;
  /** Ghost suggestion that stays visible while the player types. */
  composeHint?: string;
  /** Hide the chrome clock the moment this viewer commits a timed action. */
  suppressActionClock?: boolean;
}

/**
 * Docked table chat: stays on the board, resizes by dragging the top handle
 * through header / composer / feed steps, and keeps people/settings in its
 * chrome so the scene never leaves play.
 */
export function ChatPanel(props: ChatPanelProps) {
  const { game, i18n, flags, voice, tutorial } = useApp();
  const { formatMessage } = i18n;

  const [chatDraft, setChatDraft] = createSignal('');
  const [height, setHeight] = createSignal(
    tutorial.lookChat() ? CHAT_COMPOSER : CHAT_DEFAULT,
  );
  const [resizing, setResizing] = createSignal(false);
  const [now, setNow] = createSignal(Date.now());
  let panelEl: HTMLElement | undefined;
  let feedScroller: HTMLDivElement | undefined;
  let stickToBottom = true;
  let feedWasOpen = false;
  let inputEl: HTMLTextAreaElement | undefined;
  let dragStartY = 0;
  let dragStartHeight = CHAT_DEFAULT;
  let lastExpanded = CHAT_DEFAULT;
  let dragging = false;
  let micHandledByPointer = false;

  const talkingAllowed = () => props.talkingAllowed !== false;
  const composerEnabled = () => props.composerEnabled !== false;
  const tableView = () => {
    if (tutorial.looking()) return tutorial.lookView();
    if (tutorial.playing()) return tutorial.playView();
    return game.view();
  };
  const silentPlaceholder = () => {
    const phase = tableView()?.phase;
    return phase === Phase.PresidentLegislative ||
      phase === Phase.ChancellorLegislative
      ? 'game.chatLawSilentPlaceholder'
      : 'game.chatSilentPlaceholder';
  };
  const chatLines = () =>
    tutorial.looking() || tutorial.playing() ? tutorial.talk() : game.chatMessages();
  const youId = () => tableView()?.you.id;
  const writePrompt = () =>
    tutorial.looking() && tutorial.lookWait() === 'try'
      ? formatMessage('onboard.idea.writeSomething')
      : undefined;
  const slowSecondsLeft = () => {
    if (tutorial.looking() || tutorial.playing()) return 0;
    const until = game.chatSlowUntil();
    if (until <= 0) return 0;
    return Math.max(0, Math.ceil((until - now()) / 1000));
  };
  const canSend = () =>
    composerEnabled() &&
    talkingAllowed() &&
    slowSecondsLeft() === 0 &&
    chatDraft().trim() !== '';
  const bodyOpen = () => height() >= CHAT_COMPOSER - COMPOSER_SNAP_SLACK;
  const showComposer = () => composerEnabled() && bodyOpen();
  // Without a composer, the composer-step height is still tall enough for the feed.
  const feedOpen = () =>
    composerEnabled() ? height() > CHAT_COMPOSER + 8 : bodyOpen();

  const clampHeight = (next: number) => {
    const available = panelEl?.parentElement?.clientHeight ?? 0;
    const max =
      available > BOARD_RESERVE
        ? Math.max(CHAT_MIN, available - BOARD_RESERVE)
        : 560;
    return Math.round(Math.min(max, Math.max(CHAT_MIN, next)));
  };

  const growLookChat = () => {
    if (
      import.meta.env.MODE === 'test' ||
      process.env.NODE_ENV === 'test' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    ) {
      applyHeight(CHAT_DEFAULT);
      return;
    }
    applyHeight(CHAT_COMPOSER);
    const frame = requestAnimationFrame(() => {
      applyHeight(CHAT_DEFAULT);
    });
    onCleanup(() => cancelAnimationFrame(frame));
  };

  const applyHeight = (next: number, persist = false) => {
    const clamped = clampHeight(next);
    setHeight(clamped);
    if (clamped > CHAT_COMPOSER + 24) lastExpanded = clamped;
    if (persist) {
      try {
        localStorage.setItem(HEIGHT_KEY, String(clamped));
      } catch {
        /* private mode */
      }
    }
  };

  const snapHeight = (next: number) => {
    if (next < (CHAT_MIN + CHAT_COMPOSER) / 2) return CHAT_MIN;
    if (next < CHAT_COMPOSER + COMPOSER_SNAP_SLACK) return CHAT_COMPOSER;
    return next;
  };

  createEffect(() => props.onHeightChange?.(height()));

  createEffect(() => {
    chatLines();
    game.unreadChat();
    if (feedOpen() && !tutorial.playing()) game.markChatRead();
  });

  createEffect(() => {
    chatLines();
    if (feedScroller && stickToBottom) scrollChatToBottom(feedScroller);
  });

  createEffect(() => {
    const open = feedOpen();
    if (open && !feedWasOpen) {
      if (feedScroller) scrollChatToBottom(feedScroller);
      stickToBottom = true;
    }
    feedWasOpen = open;
  });

  const autosizeInput = () => {
    if (inputEl) growComposerHeight(inputEl);
  };

  createEffect(() => {
    chatDraft();
    queueMicrotask(autosizeInput);
  });

  onMount(() => {
    game.markChatRead();
    if (tutorial.lookChat()) growLookChat();
    else {
      try {
        const stored = Number(localStorage.getItem(HEIGHT_KEY));
        if (Number.isFinite(stored) && stored > 0) applyHeight(stored);
      } catch {
        applyHeight(height());
      }
    }
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    const onWinResize = () => {
      if (inputEl != null && document.activeElement === inputEl) return;
      applyHeight(height());
    };
    window.addEventListener('resize', onWinResize);
    onCleanup(() => {
      clearInterval(ticker);
      window.removeEventListener('resize', onWinResize);
    });
  });

  const actionSecondsLeft = () => {
    if (props.suppressActionClock) return null;
    if (tutorial.looking() || tutorial.playing()) return null;
    const state = game.view();
    if (!state) return null;
    // Announce breaths are a short hold so Ravi can finish — not a clock.
    if (state.breathDeadline && !state.kickVote) return null;
    const clock = state.kickVote?.startedAt ?? now();
    // Law pick clocks the card modal. Powers live in the parchment header.
    const deadline =
      state.kickVote ??
      state.discussionDeadline ??
      state.nominationDeadline ??
      state.voteDeadline;
    if (!deadline) return null;
    if ('startedAt' in deadline && now() < deadline.startedAt) return null;
    return Math.max(0, Math.ceil((deadline.endsAt - clock) / 1000));
  };

  const playerById = (playerId: string) =>
    tableView()?.players.find((player) => player.id === playerId);

  const timestamp = (at: number) =>
    new Date(at).toLocaleTimeString(i18n.lang(), {
      hour: '2-digit',
      minute: '2-digit',
    });

  function sendChat(): void {
    if (!composerEnabled() || !talkingAllowed() || !canSend()) return;
    if (tutorial.looking()) tutorial.say(chatDraft(), props.composeHint);
    else if (tutorial.playing()) tutorial.say(chatDraft());
    else game.sendChat(chatDraft());
    setChatDraft('');
    setNow(Date.now());
    if (inputEl) {
      inputEl.value = '';
      growComposerHeight(inputEl);
    }
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
    applyHeight(snapHeight(height()), true);
  }

  function onResizeToggle(): void {
    if (height() > CHAT_COMPOSER + 8) {
      applyHeight(CHAT_COMPOSER, true);
      return;
    }
    if (bodyOpen()) {
      applyHeight(CHAT_MIN, true);
      return;
    }
    applyHeight(lastExpanded, true);
  }

  return (
    <section
      classList={{
        [styles.panel]: true,
        [styles.resizing]: resizing(),
        [styles.lookGrow]: tutorial.lookChat(),
      }}
      style={{ height: `${height()}px`, 'flex-basis': `${height()}px` }}
      aria-label={formatMessage('game.chat')}
      data-tutorial-target="chat"
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
                {...commitOnPress(() => props.onAction?.())}
              >
                {props.actionLabel}
              </button>
            </Show>
          </Show>
          <Show when={actionSecondsLeft() != null}>
            <span
              classList={{
                [styles.timer]: true,
                [styles.urgent]: (actionSecondsLeft() ?? 0) <= 10,
              }}
            >
              <Icon name="clock" size={13} />
              {formatMessage('game.discussionLeft', {
                time: formatClock(actionSecondsLeft()!),
              })}
            </span>
          </Show>
        </div>

        <div class={styles.tools}>
          <Show when={tutorial.looking() || flags.flags.voice}>
            <button
              type="button"
              classList={{
                [styles.tool]: true,
                [styles.toolMuted]: !tutorial.looking() && voice.selfMuted(),
              }}
              data-tutorial-target="mic"
              aria-label={formatMessage(
                tutorial.looking() || !voice.selfMuted()
                  ? 'game.muteSelf'
                  : 'game.unmuteSelf',
              )}
              aria-pressed={tutorial.looking() || !voice.selfMuted()}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                if (tutorial.looking()) {
                  event.preventDefault();
                  return;
                }
                // Swallow the synthetic click — both handlers would toggle twice
                // and the mic could never stay muted.
                micHandledByPointer = true;
                event.preventDefault();
                voice.toggleSelfMute();
              }}
              onClick={() => {
                if (tutorial.looking()) return;
                if (micHandledByPointer) {
                  micHandledByPointer = false;
                  return;
                }
                voice.toggleSelfMute();
              }}
            >
              <Icon
                name={
                  tutorial.looking() || !voice.selfMuted() ? 'mic' : 'micOff'
                }
                size={20}
              />
            </button>
          </Show>
          <Show when={!tutorial.looking()}>
            <button
              type="button"
              class={styles.tool}
              aria-label={formatMessage('game.playersTitle')}
              onClick={props.onOpenPlayers}
            >
              <Icon name="people" size={20} />
            </button>
            <button
              type="button"
              class={styles.tool}
              aria-label={formatMessage('game.historyTitle')}
              onClick={props.onOpenHistory}
            >
              <Icon name="scroll" size={20} />
            </button>
            <Show when={props.onSkipTimer}>
              <button
                type="button"
                class={styles.tool}
                aria-label={formatMessage('game.skipTimer')}
                onClick={() => props.onSkipTimer?.()}
              >
                <Icon name="skip" size={20} />
              </button>
            </Show>
            <span class={styles.toolDivider} aria-hidden="true" />
            <button
              type="button"
              class={styles.tool}
              aria-label={formatMessage('settings.title')}
              onClick={props.onOpenMenu}
            >
              <Icon name="gear" size={20} />
            </button>
          </Show>
        </div>
      </header>

      <Show when={bodyOpen()}>
        <div
          classList={{
            [styles.feed]: true,
            [styles.feedCollapsed]: !feedOpen(),
          }}
          data-tutorial-target="messages"
          ref={(element) => {
            feedScroller = element;
            if (feedOpen()) {
              scrollChatToBottom(element);
              stickToBottom = true;
            }
          }}
          aria-hidden={!feedOpen()}
          onScroll={() => {
            if (!feedScroller) return;
            stickToBottom = stickAfterFeedScroll(
              feedOpen(),
              isChatNearBottom(feedScroller),
              stickToBottom,
            );
          }}
        >
          <For each={chatLines()}>
            {(message) => {
              const mine = () => message.playerId === youId();
              const player = () => playerById(message.playerId);
              const body = () =>
                'key' in message && message.key
                  ? formatMessage(message.key, 'values' in message ? message.values : undefined)
                  : message.text ?? '';
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
                        <WarmImg src={avatarImage(seated().avatar)} alt="" />
                      )}
                    </Show>
                  </span>
                  <div class={styles.bubble}>
                    <bdi class={styles.author}>
                      {playerLabel(mine(), message.name, formatMessage)}
                    </bdi>
                    <bdi class={styles.text}>{body()}</bdi>
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

        <Show when={showComposer()}>
        <div
          classList={{
            [styles.composer]: true,
            [styles.composerMuted]: !talkingAllowed(),
          }}
          data-tutorial-target="composer"
        >
          <div class={styles.composerField}>
            <Show when={props.composeHint}>
              <span class={styles.composeHint} aria-hidden="true" dir={i18n.dir()}>
                {props.composeHint}
              </span>
            </Show>
            <textarea
              class={styles.input}
              rows={1}
              dir={i18n.dir()}
              aria-label={
                writePrompt() ??
                props.composeHint ??
                formatMessage(
                  !talkingAllowed()
                    ? silentPlaceholder()
                    : 'game.chatPlaceholder',
                )
              }
              placeholder={
                writePrompt()
                  ? writePrompt()
                  : props.composeHint
                    ? ''
                    : !talkingAllowed() && !tutorial.looking()
                      ? formatMessage(silentPlaceholder())
                      : slowSecondsLeft() > 0
                        ? formatMessage('game.chatSlowPlaceholder', {
                            seconds: slowSecondsLeft(),
                          })
                        : formatMessage('game.chatPlaceholder')
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
          </div>
          <button
            type="button"
            class={styles.send}
            aria-label={
              slowSecondsLeft() > 0
                ? formatMessage('game.chatSlowWait', {
                    seconds: slowSecondsLeft(),
                  })
                : formatMessage('game.send')
            }
            disabled={!canSend()}
            onClick={sendChat}
          >
            <Show
              when={slowSecondsLeft() === 0}
              fallback={
                <span class={styles.slowCount}>
                  {formatMessage('game.chatSlowCount', {
                    seconds: slowSecondsLeft(),
                  })}
                </span>
              }
            >
              <Icon name="send" size={20} />
            </Show>
          </button>
        </div>
        </Show>
      </Show>
    </section>
  );
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
