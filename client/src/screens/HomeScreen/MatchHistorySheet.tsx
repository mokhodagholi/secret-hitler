import { For, Show, createEffect, createSignal } from 'solid-js';
import { useApp } from '../../services/AppContext';
import type { SocialIdentity } from '../../services/SocialService';
import { playerLabel } from '../../i18n/perspective';
import { Icon } from '../../components/Icon/Icon';
import {
  HISTORY_ADD_ACCOUNT,
  HISTORY_LOSS_ID,
  HISTORY_TARGET,
  HISTORY_WIN_ID,
} from '../../tutorial/historyView';
import sheet from './InviteFriendsSheet.module.scss';
import styles from './MatchHistorySheet.module.scss';

export interface MatchHistorySheetProps {
  open: boolean;
  identity: SocialIdentity;
  onClose: () => void;
}

/** Past tables the player sat at. Add from here the same as after a match. */
export function MatchHistorySheet(props: MatchHistorySheetProps) {
  const { social, i18n, animation, tutorial } = useApp();
  const { formatMessage } = i18n;
  const [expandedIds, setExpandedIds] = createSignal<string[]>([]);

  const reviewing = () => tutorial.reviewingHistory();
  const matches = () =>
    reviewing() ? tutorial.historyMatches() : social.history();

  createEffect(() => {
    if (!props.open) setExpandedIds([]);
  });

  let scrolledLoss = false;

  createEffect(() => {
    if (!reviewing() || !matches().some((match) => match.id === HISTORY_LOSS_ID)) {
      scrolledLoss = false;
    }
  });

  function tie(accountId: string) {
    return reviewing() ? tutorial.historyTie(accountId) : social.accountTie(accountId);
  }

  function expanded(id: string): boolean {
    if (reviewing()) return tutorial.historyExpandIds().includes(id);
    return expandedIds().includes(id);
  }

  function toggle(id: string): void {
    if (reviewing()) return;
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((openId) => openId !== id) : [...current, id],
    );
  }

  function endedLabel(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(i18n.lang() === 'fa' ? 'fa-IR' : 'en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function addFriend(accountId: string): void {
    if (reviewing()) {
      tutorial.addHistoryFriend(accountId);
      return;
    }
    void social.requestFriendFromHistory(accountId, props.identity);
  }

  return (
    <Show when={props.open}>
      <div
        class={sheet.backdrop}
        ref={(element) => void animation.play(element, 'fade-in')}
        onClick={(event) => {
          if (reviewing()) return;
          if (event.target === event.currentTarget) props.onClose();
        }}
      >
        <div
          class={sheet.sheet}
          role="dialog"
          aria-modal="true"
          aria-label={formatMessage('home.history')}
          data-tutorial-target={reviewing() ? HISTORY_TARGET.sheet : undefined}
          ref={(element) => void animation.play(element, 'pop-in')}
        >
          <header class={sheet.header}>
            <span class={sheet.title}>{formatMessage('home.history')}</span>
            <button
              type="button"
              class={sheet.close}
              aria-label={formatMessage('common.goBack')}
              onClick={() => {
                if (reviewing()) return;
                props.onClose();
              }}
            >
              <Icon name="close" size={20} />
            </button>
          </header>

          <div class={sheet.list}>
            <Show
              when={matches().length > 0}
              fallback={<p class={sheet.empty}>{formatMessage('home.historyEmpty')}</p>}
            >
              <For each={matches()}>
                {(match) => {
                  const open = () => expanded(match.id);
                  const teachingWin = () => reviewing() && match.id === HISTORY_WIN_ID;
                  return (
                    <article
                      class={styles.match}
                      data-tutorial-target={
                        reviewing() && match.id === HISTORY_LOSS_ID
                          ? HISTORY_TARGET.loss
                          : undefined
                      }
                      ref={(element) => {
                        if (match.id !== HISTORY_LOSS_ID) return;
                        if (!element || !reviewing() || scrolledLoss) return;
                        scrolledLoss = true;
                        if (typeof element.scrollIntoView === 'function') {
                          element.scrollIntoView({
                            behavior: animation.motionEnabled() ? 'smooth' : 'auto',
                            block: 'nearest',
                          });
                        }
                        void animation.play(element, 'history-card-in');
                      }}
                    >
                      <button
                        type="button"
                        class={styles.matchHead}
                        aria-expanded={open()}
                        onClick={() => toggle(match.id)}
                      >
                        <span class={styles.matchCopy}>
                          <span
                            class={styles.outcome}
                            data-tutorial-target={
                              teachingWin() ? HISTORY_TARGET.outcome : undefined
                            }
                          >
                            {formatMessage(
                              match.winner === 'liberal'
                                ? 'game.over.liberalsWin'
                                : 'game.over.fascistsWin',
                            )}
                          </span>
                          <span
                            class={styles.result}
                            data-tutorial-target={
                              teachingWin() ? HISTORY_TARGET.result : undefined
                            }
                          >
                            {formatMessage(
                              match.youWon ? 'home.historyWon' : 'home.historyLost',
                            )}
                            {endedLabel(match.endedAt)
                              ? ` · ${endedLabel(match.endedAt)}`
                              : ''}
                          </span>
                        </span>
                        <Icon
                          name={open() ? 'chevronDown' : 'chevronRight'}
                          size={16}
                        />
                      </button>
                      <Show when={open()}>
                        <div
                          class={styles.seats}
                          data-tutorial-target={
                            teachingWin() ? HISTORY_TARGET.players : undefined
                          }
                        >
                          <For
                            each={[...match.players].sort(
                              (left, right) => left.seat - right.seat,
                            )}
                          >
                            {(player) => (
                              <div
                                class={styles.seat}
                                data-tutorial-target={
                                  teachingWin() && player.you
                                    ? HISTORY_TARGET.you
                                    : undefined
                                }
                              >
                                <span class={styles.name}>
                                  {playerLabel(player.you, player.name, formatMessage)}
                                </span>
                                <span
                                  classList={{
                                    [styles.role]: true,
                                    [styles.roleLiberal]: player.role === 'liberal',
                                    [styles.roleFascist]: player.role !== 'liberal',
                                  }}
                                  data-tutorial-target={
                                    teachingWin() ? HISTORY_TARGET.role : undefined
                                  }
                                >
                                  {formatMessage(`role.${player.role}`)}
                                </span>
                                <Show when={player.you ? undefined : player.accountId}>
                                  {(accountId) => (
                                    <>
                                      <Show when={tie(accountId()) === 'none'}>
                                        <button
                                          type="button"
                                          class={styles.add}
                                          data-tutorial-target={
                                            reviewing() &&
                                            accountId() === HISTORY_ADD_ACCOUNT
                                              ? HISTORY_TARGET.add
                                              : undefined
                                          }
                                          disabled={
                                            !reviewing() &&
                                            social.requestingId() === accountId()
                                          }
                                          onClick={() => addFriend(accountId())}
                                        >
                                          {formatMessage('game.over.addFriend')}
                                        </button>
                                      </Show>
                                      <Show when={tie(accountId()) === 'outgoing'}>
                                        <span
                                          class={styles.added}
                                          data-tutorial-target={
                                            reviewing()
                                              ? HISTORY_TARGET.tie
                                              : undefined
                                          }
                                        >
                                          {formatMessage('game.over.sent')}
                                        </span>
                                      </Show>
                                      <Show when={tie(accountId()) === 'friends'}>
                                        <span
                                          class={styles.added}
                                          data-tutorial-target={
                                            reviewing()
                                              ? HISTORY_TARGET.tie
                                              : undefined
                                          }
                                        >
                                          {formatMessage('game.over.friends')}
                                        </span>
                                      </Show>
                                      <Show when={tie(accountId()) === 'incoming'}>
                                        <span
                                          class={styles.added}
                                          data-tutorial-target={
                                            reviewing()
                                              ? HISTORY_TARGET.tie
                                              : undefined
                                          }
                                        >
                                          {formatMessage('social.incomingRequests')}
                                        </span>
                                      </Show>
                                    </>
                                  )}
                                </Show>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </article>
                  );
                }}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
