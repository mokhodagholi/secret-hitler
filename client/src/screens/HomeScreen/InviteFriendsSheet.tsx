import { For, Show } from 'solid-js';
import { HOME_TABLE_INVITE_NOTE, type SocialPerson } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import { avatarImage } from '../../assets/avatars';
import styles from './InviteFriendsSheet.module.scss';

export interface InviteFriendsSheetProps {
  open: boolean;
  onClose: () => void;
  onInvite: (friend: SocialPerson) => void;
  onAcceptInvite: (id: string) => void;
  onIgnoreInvite: (id: string) => void;
  onAcceptRequest: (id: string) => void;
  onIgnoreRequest: (id: string) => void;
}

/** Friends the player can see, plus pending invites, over a dimmed home. */
export function InviteFriendsSheet(props: InviteFriendsSheetProps) {
  const { social, i18n, animation } = useApp();
  const { formatMessage } = i18n;
  const snapshot = () => social.snapshot();

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
          aria-label={formatMessage('home.inviteFriends')}
          ref={(element) => void animation.play(element, 'pop-in')}
        >
          <header class={styles.header}>
            <span class={styles.title}>{formatMessage('home.inviteFriends')}</span>
            <button
              type="button"
              class={styles.close}
              aria-label={formatMessage('common.goBack')}
              onClick={() => props.onClose()}
            >
              <Icon name="close" size={20} />
            </button>
          </header>

          <div class={styles.list}>
            <Show when={snapshot().incomingInvites.length > 0}>
              <p class={styles.section}>{formatMessage('social.incomingInvites')}</p>
              <For each={snapshot().incomingInvites}>
                {(invite) => (
                  <div class={styles.row}>
                    <WarmImg
                      class={styles.portrait}
                      src={avatarImage(invite.from.avatar)}
                      alt=""
                    />
                    <div class={styles.copy}>
                      <span class={styles.name}>{invite.from.name}</span>
                      <span class={styles.note}>
                        {formatMessage(`social.notes.${invite.noteId}`)}
                      </span>
                    </div>
                    <div class={styles.actions}>
                      <button
                        type="button"
                        class={styles.accept}
                        onClick={() => props.onAcceptInvite(invite.id)}
                      >
                        {formatMessage('social.sit')}
                      </button>
                      <button
                        type="button"
                        class={styles.ignore}
                        onClick={() => props.onIgnoreInvite(invite.id)}
                      >
                        {formatMessage('social.notNow')}
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </Show>

            <Show when={snapshot().incomingRequests.length > 0}>
              <p class={styles.section}>{formatMessage('social.incomingRequests')}</p>
              <For each={snapshot().incomingRequests}>
                {(request) => (
                  <div class={styles.row}>
                    <WarmImg
                      class={styles.portrait}
                      src={avatarImage(request.from.avatar)}
                      alt=""
                    />
                    <div class={styles.copy}>
                      <span class={styles.name}>{request.from.name}</span>
                      <span class={styles.note}>{formatMessage('social.wantsFriend')}</span>
                    </div>
                    <div class={styles.actions}>
                      <button
                        type="button"
                        class={styles.accept}
                        onClick={() => props.onAcceptRequest(request.id)}
                      >
                        {formatMessage('social.accept')}
                      </button>
                      <button
                        type="button"
                        class={styles.ignore}
                        onClick={() => props.onIgnoreRequest(request.id)}
                      >
                        {formatMessage('social.notNow')}
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </Show>

            <Show
              when={snapshot().friends.length > 0}
              fallback={
                <Show
                  when={
                    snapshot().incomingInvites.length === 0 &&
                    snapshot().incomingRequests.length === 0
                  }
                >
                  <p class={styles.empty}>{formatMessage('social.emptyFriends')}</p>
                </Show>
              }
            >
              <p class={styles.section}>{formatMessage('social.friends')}</p>
              <For each={snapshot().friends}>
                {(friend) => (
                    <button
                      type="button"
                      class={styles.inviteRow}
                      disabled={social.invitingId() === friend.accountId}
                      onClick={() => props.onInvite(friend)}
                    >
                      <WarmImg
                        class={styles.portrait}
                        src={avatarImage(friend.avatar)}
                        alt=""
                      />
                      <span class={styles.copy}>
                        <span class={styles.name}>{friend.name}</span>
                        <span class={styles.note}>
                          {formatMessage(`social.notes.${HOME_TABLE_INVITE_NOTE}`)}
                        </span>
                      </span>
                      <span class={styles.inviteHint}>
                        {social.invitingId() === friend.accountId
                          ? formatMessage('social.sending')
                          : snapshot().outgoingInvites.some(
                                (invite) => invite.to.accountId === friend.accountId,
                              )
                            ? formatMessage('social.sent')
                            : formatMessage('home.inviteFriends')}
                      </span>
                    </button>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
