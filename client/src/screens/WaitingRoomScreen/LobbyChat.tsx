import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { playerLabel } from '../../i18n/perspective';
import { avatarImage } from '../../assets/avatars';
import { Icon } from '../../components/Icon/Icon';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import { nativeFieldAttrs } from '../../components/nativeField';
import { KeyboardForm } from '../../components/KeyboardForm/KeyboardForm';
import styles from './LobbyChat.module.scss';

/**
 * Waiting-room talk only — in-game ChatPanel also owns votes, voice, and a
 * resize dock, which do not belong at the lobby table.
 */
export function LobbyChat() {
  const { game, i18n } = useApp();
  const { formatMessage } = i18n;

  const [chatDraft, setChatDraft] = createSignal('');
  const [nowMs, setNowMs] = createSignal(Date.now());
  let feedScroller: HTMLDivElement | undefined;
  let composerField: HTMLTextAreaElement | undefined;

  const slowSecondsLeft = () => {
    const until = game.chatSlowUntil();
    if (until <= 0) return 0;
    return Math.max(0, Math.ceil((until - nowMs()) / 1000));
  };
  const canSend = () => slowSecondsLeft() === 0 && chatDraft().trim() !== '';

  const timestamp = (at: number) =>
    new Date(at).toLocaleTimeString(i18n.lang(), {
      hour: '2-digit',
      minute: '2-digit',
    });

  const playerById = (playerId: string) =>
    game.view()?.players.find((player) => player.id === playerId);

  createEffect(() => {
    game.chatMessages();
    game.unreadChat();
    game.markChatRead();
  });

  createEffect(() => {
    game.chatMessages();
    if (feedScroller) feedScroller.scrollTop = feedScroller.scrollHeight;
  });

  const autosizeField = () => {
    const field = composerField;
    if (!field) return;
    field.style.height = '0';
    field.style.height = `${field.scrollHeight}px`;
  };

  createEffect(() => {
    chatDraft();
    queueMicrotask(autosizeField);
  });

  onMount(() => {
    game.markChatRead();
    const ticker = setInterval(() => setNowMs(Date.now()), 1000);
    onCleanup(() => clearInterval(ticker));
  });

  function sendChat(): void {
    if (!canSend()) return;
    game.sendChat(chatDraft());
    setChatDraft('');
    setNowMs(Date.now());
  }

  return (
    <section class={styles.panel} role="region" aria-label={formatMessage('waiting.chat')}>
      <div class={styles.feed} ref={(element) => (feedScroller = element)}>
        <Show when={game.chatMessages().length === 0}>
          <p class={styles.empty}>{formatMessage('waiting.chatEmpty')}</p>
        </Show>
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
                    fallback={<Icon name="people" size={16} />}
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

      <KeyboardForm class={styles.composer}>
        <textarea
          class={styles.input}
          rows={1}
          dir={i18n.dir()}
          value={chatDraft()}
          placeholder={
            slowSecondsLeft() > 0
              ? formatMessage('game.chatSlowPlaceholder', {
                  seconds: slowSecondsLeft(),
                })
              : formatMessage('game.chatPlaceholder')
          }
          maxlength={500}
          {...nativeFieldAttrs({ enterKeyHint: 'send' })}
          ref={(element) => {
            composerField = element;
            queueMicrotask(autosizeField);
          }}
          onInput={(event) => setChatDraft(event.currentTarget.value)}
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
            <Icon name="send" size={18} />
          </Show>
        </button>
      </KeyboardForm>
    </section>
  );
}
