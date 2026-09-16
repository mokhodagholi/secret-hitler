import { For, Show } from 'solid-js';
import { useApp } from '../../services/AppContext';
import type { SocialIdentity } from '../../services/SocialService';
import { playerLabel } from '../../i18n/perspective';
import { Icon } from '../../components/Icon/Icon';
import sheet from './InviteFriendsSheet.module.scss';
import styles from './MatchHistorySheet.module.scss';

export interface MatchHistorySheetProps {
  open: boolean;
  identity: SocialIdentity;
  onClose: () => void;
}

/** Past tables the player sat at. Add from here the same as after a match. */
export function MatchHistorySheet(props: MatchHistorySheetProps) {
  const { social, i18n, animation } = useApp();
  const { formatMessage } = i18n;

  function endedLabel(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(i18n.lang() === 'fa' ? 'fa-IR' : 'en-GB', {
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <Show when={props.open}>
      <div
        class={sheet.backdrop}
        ref={(element) => void animation.play(element, 'fade-in')}
        onClick={(event) => {
          if (event.target === event.currentTarget) props.onClose();
        }}
      >
        <div
          class={sheet.sheet}
          role="dialog"
          aria-modal="true"
          aria-label={formatMessage('home.history')}
          ref={(element) => void animation.play(element, 'pop-in')}
        >
          <header class={sheet.header}>
            <span class={sheet.title}>{formatMessage('home.history')}</span>
            <button
              type="button"
              class={sheet.close}
              aria-label={formatMessage('common.goBack')}
              onClick={() => props.onClose()}
            >
              <Icon name="close" size={20} />
            </button>
          </header>

          <div class={sheet.list}>
            <Show
              when={social.history().length > 0}
              fallback={<p class={sheet.empty}>{formatMessage('home.historyEmpty')}</p>}
            >
              <For each={social.history()}>
                {(match) => (
                  <article class={styles.match}>
                    <div class={styles.matchHead}>
                      <span class={styles.outcome}>
                        {formatMessage(
                          match.winner === 'liberal'
                            ? 'game.over.liberalsWin'
                            : 'game.over.fascistsWin',
                        )}
                      </span>
                      <span class={styles.result}>
                        {formatMessage(match.youWon ? 'home.historyWon' : 'home.historyLost')}
                        {endedLabel(match.endedAt) ? ` · ${endedLabel(match.endedAt)}` : ''}
                      </span>
                    </div>
                    <For each={[...match.players].sort((left, right) => left.seat - right.seat)}>
                      {(player) => (
                        <div class={styles.seat}>
                          <span class={styles.name}>
                            {playerLabel(player.you, player.name, formatMessage)}
                          </span>
                          <span
                            classList={{
                              [styles.role]: true,
                              [styles.roleLiberal]: player.role === 'liberal',
                              [styles.roleFascist]: player.role !== 'liberal',
                            }}
                          >
                            {formatMessage(`role.${player.role}`)}
                          </span>
                          <Show when={player.you ? undefined : player.accountId}>
                            {(accountId) => (
                              <>
                                <Show when={social.accountTie(accountId()) === 'none'}>
                                  <button
                                    type="button"
                                    class={styles.add}
                                    disabled={social.requestingId() === accountId()}
                                    onClick={() =>
                                      void social.requestFriendFromHistory(accountId(), props.identity)
                                    }
                                  >
                                    {formatMessage('game.over.addFriend')}
                                  </button>
                                </Show>
                                <Show when={social.accountTie(accountId()) === 'outgoing'}>
                                  <span class={styles.added}>{formatMessage('game.over.sent')}</span>
                                </Show>
                                <Show when={social.accountTie(accountId()) === 'friends'}>
                                  <span class={styles.added}>{formatMessage('game.over.friends')}</span>
                                </Show>
                                <Show when={social.accountTie(accountId()) === 'incoming'}>
                                  <span class={styles.added}>
                                    {formatMessage('social.incomingRequests')}
                                  </span>
                                </Show>
                              </>
                            )}
                          </Show>
                        </div>
                      )}
                    </For>
                  </article>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
