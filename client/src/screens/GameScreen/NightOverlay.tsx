import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import {
  OPENING_CEREMONY_MS,
  OPENING_DEAL_MS,
  OPENING_GLANCE_MS,
  OPENING_LOOK_MS,
  type PublicPlayer,
  type Role,
} from '@secret-hitler/shared';
import type { MessageKey } from '../../i18n';
import { useApp } from '../../services/AppContext';
import type { RaviLineId } from '../../services/RaviService';
import { avatarImage } from '../../assets/avatars';
import { CARD_BACK, NIGHT_VEIL, PARTY_FACE, ROLE_FACE } from '../../assets/cards';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import { flyToTarget } from './cardFlight';
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
export const DEAL_MS = OPENING_DEAL_MS;
export const NIGHT_MS = 0;
export const LOOK_MS = OPENING_LOOK_MS;
export const GLANCE_MS = OPENING_GLANCE_MS;
export const LOOK_AT_MS = DEAL_MS + NIGHT_MS;
export const GLANCE_AT_MS = LOOK_AT_MS + LOOK_MS;
export const CEREMONY_MS = OPENING_CEREMONY_MS;

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

function glanceLine(role: Role, playerCount: number): RaviLineId {
  if (role === 'fascist') {
    return playerCount <= 6
      ? 'private.nightFascistSmall'
      : 'private.nightFascistLarge';
  }
  // Liberals and Hitler: keep your eyes closed.
  return 'private.nightLiberal';
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
 * the private look, then the team glance. Beats stay on the shared clock.
 */
export function NightOverlay(props: NightOverlayProps) {
  const { i18n, ravi, animation, sound } = useApp();
  const { formatMessage } = i18n;
  const [beat, setBeat] = createSignal<Beat>('deal');
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
    sound.play('night-fall');
    sound.play('card-flip');
    void ravi.speak('night.start');
    void ravi.speak(lookKey(props.role).slice('ravi.'.length) as RaviLineId);
  }

  function openGlance(): void {
    if (closed || beat() === 'glance') return;
    clearTimeout(lookTimer);
    clearTimeout(glanceTimer);
    ravi.cancel();
    setBeat('glance');
    sound.play('glance-tick');
    void ravi.speak(glanceLine(props.role, props.playerCount));
  }

  function finish(): void {
    if (closed) return;
    closed = true;
    clearTimeout(lookTimer);
    clearTimeout(glanceTimer);
    clearTimeout(doneTimer);
    ravi.cancel();
    sound.play('night-lift');
    void ravi.speak('night.end');
    void ravi.speak(
      props.presidentIsYou ? 'president.firstYou' : 'president.first',
      { name: props.presidentName },
    );
    props.onDone();
  }

  const showingLook = () => beat() === 'look';
  const seeingTeam = () => {
    if (beat() !== 'glance' || props.role === 'liberal') return false;
    // Hitler always keeps eyes closed; Fascists look at their teammates.
    if (props.role === 'hitler') return false;
    return true;
  };
  const raisingHand = () =>
    beat() === 'glance' && props.role === 'hitler' && props.playerCount > 6;
  const you = () => props.players.find((player) => player.id === props.youId);

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
        <WarmImg
          class={styles.veil}
          src={NIGHT_VEIL}
          alt=""
          ref={(element) => void animation.play(element, 'fade-in')}
        />
      </Show>

      <Show when={beat() === 'deal'}>
        <DealBacks players={props.players} youId={props.youId} />
      </Show>

      <Show when={showingLook()}>
        <div
          class={styles.sheet}
          ref={(element) => void animation.play(element, 'pop-in')}
        >
          <p class={styles.prompt}>{formatMessage('ravi.night.start')}</p>
          <div class={styles.cards}>
            <WarmImg
              class={styles.roleCard}
              src={ROLE_FACE[props.role]}
              alt={formatMessage(`role.${props.role}`)}
              ref={(element) => void animation.play(element, 'card-flip-in')}
            />
            <WarmImg
              class={styles.partyCard}
              src={PARTY_FACE[party()]}
              alt=""
              ref={(element) => void animation.play(element, 'card-flip-in')}
            />
          </div>
          <p class={styles.blurb}>{formatMessage(lookKey(props.role))}</p>
        </div>
      </Show>

      <Show when={beat() === 'glance'}>
        <div
          class={styles.glance}
          ref={(element) => void animation.play(element, 'fade-in')}
        >
          <Show when={seeingTeam()}>
            <p class={styles.glanceLine}>
              {formatMessage(glanceKey(props.role, props.playerCount))}
            </p>
            <ul class={styles.team}>
              <For each={props.teammates}>
                {(player) => (
                  <li class={styles.teammate}>
                    <span class={styles.teammateSeat} data-teammate-seat>
                      {formatMessage('game.seatNumber', {
                        n: player.seat + 1,
                      })}
                    </span>
                    <WarmImg src={avatarImage(player.avatar)} alt="" />
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
          <Show when={!seeingTeam()}>
            <div
              class={styles.sleep}
              aria-label={formatMessage('ravi.private.nightLiberal')}
            >
              <ClosedLids />
              <Show when={raisingHand() && you()}>
                {(player) => (
                  <div class={styles.teammate}>
                    <span class={styles.teammateSeat} data-teammate-seat>
                      {formatMessage('game.seatNumber', {
                        n: player().seat + 1,
                      })}
                    </span>
                    <WarmImg src={avatarImage(player().avatar)} alt="" />
                    <span dir="auto">{player().name}</span>
                    <em>{formatMessage('game.raiseHand')}</em>
                  </div>
                )}
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

/** Gold-line closed eyelids — the closed-eyes wait, with no extra instruction. */
function ClosedLids() {
  return (
    <svg class={styles.lids} viewBox="0 0 160 56" aria-hidden="true">
      <path d="M12 32c18-20 42-20 58 0" />
      <path d="M90 32c18-20 42-20 58 0" />
      <path d="M18 36c16 10 38 10 52 0" />
      <path d="M90 36c16 10 38 10 52 0" />
    </svg>
  );
}

/** Face-down role cards start in a pile, then fly to each seat one by one. */
function DealBacks(props: { players: PublicPlayer[]; youId: string }) {
  const { animation, sound } = useApp();
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
        sound.play('deal-slide');
        await flyToTarget(animation, cards[index], seatPortrait(props.players[index].id), {
          landScale: 0.45,
          duration: 560,
        });
      }
    })();
  });

  return (
    <div class={styles.dealLayer} aria-hidden="true">
      <div class={styles.dealDeck}>
        <WarmImg src={CARD_BACK} alt="" />
        <WarmImg src={CARD_BACK} alt="" />
        <WarmImg src={CARD_BACK} alt="" />
      </div>
      <For each={props.players}>
        {(player, index) => (
          <WarmImg
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

function seatPortrait(playerId: string): Element | null {
  return (
    document.querySelector(
      `[data-seat-id="${escapeAttr(playerId)}"] [data-seat-target]`,
    ) ?? document.querySelector(`[data-seat-id="${escapeAttr(playerId)}"]`)
  );
}
