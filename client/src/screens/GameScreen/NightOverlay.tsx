import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import type { PublicPlayer, Role } from '@secret-hitler/shared';
import type { MessageKey } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { avatarImage } from '../../assets/avatars';
import { NIGHT_VEIL, PARTY_FACE, ROLE_FACE } from '../../assets/cards';
import styles from './NightOverlay.module.scss';

export interface NightOverlayProps {
  role: Role;
  playerCount: number;
  teammates: PublicPlayer[];
  presidentName: string;
  onDone: () => void;
}

const LOOK_MS = 12_000;
const GLANCE_MS = 9_000;

type Beat = 'look' | 'glance';

function lookKey(role: Role): MessageKey {
  if (role === 'liberal') return 'ravi.private.youLiberal';
  if (role === 'hitler') return 'ravi.private.youHitler';
  return 'ravi.private.youFascist';
}

function glanceKey(role: Role, playerCount: number): MessageKey {
  const smallTable = playerCount <= 6;
  if (role === 'liberal') return 'ravi.private.nightLiberal';
  if (role === 'hitler') {
    return smallTable
      ? 'ravi.private.nightHitlerSmall'
      : 'ravi.private.nightHitlerLarge';
  }
  return smallTable
    ? 'ravi.private.nightFascistSmall'
    : 'ravi.private.nightFascistLarge';
}

/**
 * Opening ceremony: a private look at your role, then the night glance.
 * Ready-up skips only the look; the glance is shared pacing.
 */
export function NightOverlay(props: NightOverlayProps) {
  const { i18n, ravi, animation } = useApp();
  const { formatMessage } = i18n;
  const [beat, setBeat] = createSignal<Beat>('look');
  const party = () => (props.role === 'liberal' ? 'liberal' : 'fascist');

  let lookTimer: ReturnType<typeof setTimeout> | undefined;
  let glanceTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  onMount(() => {
    void ravi.speak('deal.start').then(() => {
      if (closed || beat() !== 'look') return;
      return ravi.speak('deal.look');
    });
    lookTimer = setTimeout(openGlance, LOOK_MS);
  });

  onCleanup(() => {
    closed = true;
    clearTimeout(lookTimer);
    clearTimeout(glanceTimer);
  });

  function openGlance(): void {
    if (closed || beat() !== 'look') return;
    clearTimeout(lookTimer);
    ravi.cancel();
    setBeat('glance');
    void ravi.speak('night.start');
    glanceTimer = setTimeout(() => void finish(), GLANCE_MS);
  }

  async function finish(): Promise<void> {
    if (closed) return;
    closed = true;
    clearTimeout(glanceTimer);
    await ravi.speak('night.end');
    await ravi.speak('president.first', { name: props.presidentName });
    props.onDone();
  }

  const seeingTeam = () => beat() === 'glance' && props.role !== 'liberal';

  return (
    <div
      class={styles.stage}
      role="dialog"
      aria-modal="true"
      aria-label={formatMessage('game.yourRole')}
    >
      <Show when={beat() === 'look'}>
        <div
          class={styles.sheet}
          ref={(element) => void animation.play(element, 'pop-in')}
        >
          <p class={styles.prompt}>{formatMessage('ravi.deal.look')}</p>
          <div class={styles.cards}>
            <img
              class={styles.roleCard}
              src={ROLE_FACE[props.role]}
              alt={formatMessage(`role.${props.role}`)}
            />
            <img class={styles.partyCard} src={PARTY_FACE[party()]} alt="" />
          </div>
          <p class={styles.blurb}>{formatMessage(lookKey(props.role))}</p>
          <button type="button" class={styles.gotIt} onClick={openGlance}>
            {formatMessage('game.gotIt')}
          </button>
        </div>
      </Show>

      <Show when={beat() === 'glance'}>
        <div
          class={styles.glance}
          ref={(element) => void animation.play(element, 'fade-in')}
        >
          <img class={styles.veil} src={NIGHT_VEIL} alt="" />
          <p class={styles.glanceLine}>
            {formatMessage(glanceKey(props.role, props.playerCount))}
          </p>
          <Show when={seeingTeam()}>
            <ul class={styles.team}>
              <For each={props.teammates}>
                {(player) => (
                  <li class={styles.teammate}>
                    <img src={avatarImage(player.avatar)} alt="" />
                    <span dir="auto">{player.name}</span>
                    <Show when={player.role}>
                      {(role) => (
                        <em>{formatMessage(`role.${role()}`)}</em>
                      )}
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </Show>
    </div>
  );
}
