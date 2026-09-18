import { For, Show, onMount } from 'solid-js';
import type { Faction, PublicPlayer, Role } from '@secret-hitler/shared';
import type { FormatMessage, MessageKey } from '../../i18n';
import { playerLabel } from '../../i18n/perspective';
import { useApp } from '../../services/AppContext';
import type { SocialIdentity } from '../../services/SocialService';
import styles from './GameOverOverlay.module.scss';

/** Stagger between role reveals — the "I knew it!" cascade. */
const CASCADE_STEP_MS = 140;
const CASCADE_START_MS = 350;

export type GameOverReason =
  | 'liberalPolicy'
  | 'hitlerExecuted'
  | 'fascistPolicy'
  | 'hitlerElected'
  | 'fascistNumbers';

const REASON_KEY: Record<GameOverReason, MessageKey> = {
  liberalPolicy: 'game.over.reason.liberalPolicy',
  hitlerExecuted: 'game.over.reason.hitlerExecuted',
  fascistPolicy: 'game.over.reason.fascistPolicy',
  hitlerElected: 'game.over.reason.hitlerElected',
  fascistNumbers: 'game.over.reason.fascistNumbers',
};

/** Why this board ended — policy path, Hitler, or numbers. */
export function gameOverReason(args: {
  winner: Faction;
  fascistPolicies: number;
  chancellorId: string | null;
  players: { id: string; role: Role | null; isAlive: boolean }[];
}): GameOverReason {
  if (args.winner === 'liberal') {
    const hitler = args.players.find((player) => player.role === 'hitler');
    return hitler && !hitler.isAlive ? 'hitlerExecuted' : 'liberalPolicy';
  }
  if (args.fascistPolicies >= 6) return 'fascistPolicy';
  const chancellor = args.players.find((player) => player.id === args.chancellorId);
  return chancellor?.role === 'hitler' ? 'hitlerElected' : 'fascistNumbers';
}

export interface GameOverOverlayProps {
  formatMessage: FormatMessage;
  winner: Faction;
  /** Players with roles revealed (the server discloses all roles at GameOver). */
  players: PublicPlayer[];
  chancellorId: string | null;
  fascistPolicies: number;
  youId: string;
  /** Winner, roles, and rematch wait until Ravi's reveal line. */
  showOutcome: boolean;
  wantsContinue: boolean;
  onContinue: () => void;
  onLeave: () => void;
}

/** End-of-game screen: what happened, then the winning faction and rematch. */
export function GameOverOverlay(props: GameOverOverlayProps) {
  const { formatMessage } = props;
  const { animation, social, settings, miniApp, game } = useApp();

  function identity(): SocialIdentity {
    return {
      clientId: settings.settings.profileId,
      initData: miniApp.initData(),
      name:
        (miniApp.user()?.firstName ?? settings.settings.profileName.trim()) ||
        formatMessage('home.guest'),
      avatar: settings.settings.avatar,
      token: game.currentSession()?.token,
    };
  }

  const reason = () =>
    gameOverReason({
      winner: props.winner,
      fascistPolicies: props.fascistPolicies,
      chancellorId: props.chancellorId,
      players: props.players,
    });

  onMount(() => {
    void social.load(identity()).catch(() => {});
  });
  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <div
        class={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        ref={(element) => void animation.play(element, 'pop-in')}
      >
        <span class={styles.reason}>{formatMessage(REASON_KEY[reason()])}</span>

        <Show when={props.showOutcome}>
          <span
            classList={{
              [styles.headline]: true,
              [styles.liberal]: props.winner === 'liberal',
              [styles.fascist]: props.winner === 'fascist',
            }}
          >
            {formatMessage(
              props.winner === 'liberal'
                ? 'game.over.liberalsWin'
                : 'game.over.fascistsWin',
            )}
          </span>

          <ul class={styles.roles}>
            <For each={[...props.players].sort((left, right) => left.seat - right.seat)}>
              {(player, index) => (
                <li
                  class={styles.roleRow}
                  ref={(element) =>
                    void animation.play(element, 'card-flip-in', {
                      delay: CASCADE_START_MS + index() * CASCADE_STEP_MS,
                      fill: 'backwards',
                    })
                  }
                >
                  <span class={styles.name}>
                    {playerLabel(
                      player.id === props.youId,
                      player.name,
                      formatMessage,
                    )}
                  </span>
                  <span
                    classList={{
                      [styles.role]: true,
                      [styles.roleLiberal]: player.role === 'liberal',
                      [styles.roleFascist]: player.role !== 'liberal',
                    }}
                  >
                    {player.role ? formatMessage(`role.${player.role}`) : '—'}
                  </span>
                  <Show when={player.id !== props.youId}>
                    <Show when={social.mateStatus(player.id) === 'none'}>
                      <button
                        type="button"
                        class={styles.add}
                        onClick={() => void social.requestFriend(player.id, identity())}
                      >
                        {formatMessage('game.over.addFriend')}
                      </button>
                    </Show>
                    <Show when={social.mateStatus(player.id) === 'outgoing'}>
                      <span class={styles.added}>{formatMessage('game.over.sent')}</span>
                    </Show>
                    <Show when={social.mateStatus(player.id) === 'friends'}>
                      <span class={styles.added}>{formatMessage('game.over.friends')}</span>
                    </Show>
                    <Show when={social.mateStatus(player.id) === 'incoming'}>
                      <span class={styles.added}>{formatMessage('social.incomingRequests')}</span>
                    </Show>
                  </Show>
                </li>
              )}
            </For>
          </ul>

          <Show when={props.wantsContinue}>
            <p class={styles.waiting}>{formatMessage('game.over.waiting')}</p>
          </Show>

          <div class={styles.actions}>
            <button
              type="button"
              class={styles.stay}
              disabled={props.wantsContinue}
              onClick={() => props.onContinue()}
            >
              {formatMessage('game.over.stay')}
            </button>
            <button type="button" class={styles.leave} onClick={() => props.onLeave()}>
              {formatMessage('game.leaveRoom')}
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}
