import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import type { PublicPlayer, Role } from '@secret-hitler/shared';
import type { MessageKey } from '../../i18n';
import { useApp } from '../../services/AppContext';
import type { RaviLineId } from '../../services/RaviService';
import type { AnimationService } from '../../services/AnimationService';
import { avatarImage } from '../../assets/avatars';
import { CARD_BACK, NIGHT_VEIL, PARTY_FACE, ROLE_FACE } from '../../assets/cards';
import styles from './NightOverlay.module.scss';

export interface NightOverlayProps {
  role: Role;
  playerCount: number;
  players: PublicPlayer[];
  youId: string;
  teammates: PublicPlayer[];
  presidentName: string;
  presidentIsYou?: boolean;
  /** Shared discussion start — deal, night, look, glance, and day follow this clock. */
  startedAt: number;
  onDone: () => void;
}

/** Long enough for the paused welcome clip and a 10-player one-by-one deal. */
export const DEAL_MS = 10_000;
export const NIGHT_MS = 0;
export const LOOK_MS = 12_000;
export const GLANCE_MS = 9_000;
export const LOOK_AT_MS = DEAL_MS + NIGHT_MS;
export const GLANCE_AT_MS = LOOK_AT_MS + LOOK_MS;
export const CEREMONY_MS = GLANCE_AT_MS + GLANCE_MS;

type Beat = 'deal' | 'look' | 'glance';

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
      : 'ravi.private.nightLiberal';
  }
  return smallTable
    ? 'ravi.private.nightFascistSmall'
    : 'ravi.private.nightFascistLarge';
}

function remaining(startedAt: number, durationMs: number): number {
  return Math.max(0, durationMs - (Date.now() - startedAt));
}

function dialogLabel(beat: Beat): MessageKey {
  if (beat === 'deal') return 'ravi.deal.start';
  return 'game.yourRole';
}

function escapeAttr(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&');
}

function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const tick = (left: number) => {
      if (left <= 0) {
        resolve();
        return;
      }
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => tick(left - 1));
        return;
      }
      setTimeout(() => tick(left - 1), 0);
    };
    tick(count);
  });
}

/**
 * Opening ceremony: face-down cards split to every seat, night falls with
 * the private look, then the team glance. "Got it" only tucks the cards
 * away. Beats stay on the shared clock.
 */
export function NightOverlay(props: NightOverlayProps) {
  const { i18n, ravi, animation } = useApp();
  const { formatMessage } = i18n;
  const [beat, setBeat] = createSignal<Beat>('deal');
  const [acknowledged, setAcknowledged] = createSignal(false);
  const party = () => (props.role === 'liberal' ? 'liberal' : 'fascist');

  let lookTimer: ReturnType<typeof setTimeout> | undefined;
  let glanceTimer: ReturnType<typeof setTimeout> | undefined;
  let doneTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  onMount(() => {
    const origin = props.startedAt || Date.now();
    const untilLook = remaining(origin, LOOK_AT_MS);
    const untilGlance = remaining(origin, GLANCE_AT_MS);
    const untilDone = remaining(origin, CEREMONY_MS);

    if (untilLook > 0) {
      setBeat('deal');
      void ravi.speak('deal.start');
    } else if (untilGlance > 0) {
      openLook();
    } else if (untilDone > 0) {
      openGlance();
    } else {
      finish();
      return;
    }

    if (untilLook > 0) lookTimer = setTimeout(openLook, untilLook);
    if (untilGlance > 0) glanceTimer = setTimeout(openGlance, untilGlance);
    doneTimer = setTimeout(() => finish(), untilDone);
  });

  onCleanup(() => {
    closed = true;
    clearTimeout(lookTimer);
    clearTimeout(glanceTimer);
    clearTimeout(doneTimer);
  });

  function openLook(): void {
    if (closed || beat() === 'look' || beat() === 'glance') return;
    clearTimeout(lookTimer);
    ravi.cancel();
    setBeat('look');
    void ravi.speak('night.start');
    void ravi.speak(lookKey(props.role).slice('ravi.'.length) as RaviLineId);
  }

  function openGlance(): void {
    if (closed || beat() === 'glance') return;
    clearTimeout(lookTimer);
    clearTimeout(glanceTimer);
    ravi.cancel();
    setBeat('glance');
    void ravi.speak(
      glanceKey(props.role, props.playerCount).slice('ravi.'.length) as RaviLineId,
    );
  }

  function acknowledge(): void {
    if (closed || beat() !== 'look' || acknowledged()) return;
    setAcknowledged(true);
    ravi.cancel();
  }

  function finish(): void {
    if (closed) return;
    closed = true;
    clearTimeout(lookTimer);
    clearTimeout(glanceTimer);
    clearTimeout(doneTimer);
    ravi.cancel();
    void ravi.speak('night.end');
    void ravi.speak(
      props.presidentIsYou ? 'president.firstYou' : 'president.first',
      { name: props.presidentName },
    );
    props.onDone();
  }

  const showingLook = () => beat() === 'look' && !acknowledged();
  const seeingTeam = () => beat() === 'glance' && props.role !== 'liberal';

  return (
    <div
      classList={{
        [styles.stage]: true,
        [styles.night]: beat() !== 'deal',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={formatMessage(dialogLabel(beat()))}
    >
      <Show when={beat() !== 'deal'}>
        <img
          class={styles.veil}
          src={NIGHT_VEIL}
          alt=""
          ref={(element) => void animation.play(element, 'fade-in')}
        />
      </Show>

      <Show when={beat() === 'deal'}>
        <p class={styles.caption}>{formatMessage('ravi.deal.start')}</p>
        <DealBacks players={props.players} youId={props.youId} />
      </Show>

      <Show when={showingLook()}>
        <div
          class={styles.sheet}
          ref={(element) => void animation.play(element, 'pop-in')}
        >
          <p class={styles.prompt}>{formatMessage('ravi.night.start')}</p>
          <div class={styles.cards}>
            <img
              class={styles.roleCard}
              src={ROLE_FACE[props.role]}
              alt={formatMessage(`role.${props.role}`)}
              ref={(element) => void animation.play(element, 'card-flip-in')}
            />
            <img
              class={styles.partyCard}
              src={PARTY_FACE[party()]}
              alt=""
              ref={(element) => void animation.play(element, 'card-flip-in')}
            />
          </div>
          <p class={styles.blurb}>{formatMessage(lookKey(props.role))}</p>
          <button type="button" class={styles.gotIt} onClick={acknowledge}>
            {formatMessage('game.gotIt')}
          </button>
        </div>
      </Show>

      <Show when={beat() === 'glance'}>
        <div
          class={styles.glance}
          ref={(element) => void animation.play(element, 'fade-in')}
        >
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

/** Face-down role cards start in a pile, then fly to each seat one by one. */
function DealBacks(props: { players: PublicPlayer[]; youId: string }) {
  const { animation } = useApp();
  const cards: (HTMLImageElement | undefined)[] = [];

  onMount(() => {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });
    void (async () => {
      await waitFrames(2);
      if (cancelled) return;
      for (let index = 0; index < props.players.length; index++) {
        if (cancelled) return;
        await flyToSeat(
          animation,
          cards[index],
          props.players[index].id,
          index,
          props.players.length,
        );
      }
    })();
  });

  return (
    <div class={styles.dealLayer} aria-hidden="true">
      <div class={styles.dealDeck}>
        <img src={CARD_BACK} alt="" />
        <img src={CARD_BACK} alt="" />
        <img src={CARD_BACK} alt="" />
      </div>
      <For each={props.players}>
        {(player, index) => (
          <img
            classList={{
              [styles.dealtBack]: true,
              [styles.dealtBackYou]: player.id === props.youId,
            }}
            src={CARD_BACK}
            alt=""
            ref={(element) => {
              cards[index()] = element;
            }}
          />
        )}
      </For>
    </div>
  );
}

function flyToSeat(
  animation: AnimationService,
  card: HTMLImageElement | undefined,
  playerId: string,
  index: number,
  total: number,
): Promise<void> {
  if (!card) return Promise.resolve();
  const dest = seatOffset(card, playerId, index, total);
  if (!dest) {
    card.style.opacity = '1';
    return Promise.resolve();
  }
  const tilt = index % 2 ? 8 : -8;
  const landed = `translate(${dest.x}px, ${dest.y}px) scale(0.45) rotate(${tilt}deg)`;
  const play = animation.playCustom(
    card,
    [
      { opacity: 1, transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
      { opacity: 1, transform: landed },
    ],
    { duration: 560, easing: 'ease-in-out', fill: 'forwards' },
  );
  return play.then(() => {
    card.style.opacity = '1';
    card.style.transform = landed;
  });
}

function seatOffset(
  card: HTMLElement,
  playerId: string,
  index: number,
  total: number,
): { x: number; y: number } | null {
  const origin = card.getBoundingClientRect();
  const fromX = origin.left + origin.width / 2;
  const fromY = origin.top + origin.height / 2;
  const seat = document.querySelector(`[data-seat-id="${escapeAttr(playerId)}"]`);
  if (seat instanceof HTMLElement) {
    const dest = seat.getBoundingClientRect();
    return {
      x: dest.left + dest.width / 2 - fromX,
      y: dest.top + dest.height / 2 - fromY,
    };
  }
  const table = document.querySelector('[data-game-table]');
  if (!(table instanceof HTMLElement)) return null;
  const box = table.getBoundingClientRect();
  const topCount = Math.ceil(total / 2);
  const onTop = index < topCount;
  const rowIndex = onTop ? index : index - topCount;
  const rowLen = onTop ? topCount : Math.max(1, total - topCount);
  return {
    x: box.left + ((rowIndex + 0.5) / rowLen) * box.width - fromX,
    y:
      (onTop ? box.top + box.height * 0.2 : box.bottom - box.height * 0.2) -
      fromY,
  };
}
