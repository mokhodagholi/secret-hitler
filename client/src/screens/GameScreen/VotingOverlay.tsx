import { For, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import type { Vote } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import type { AnimationService } from '../../services/AnimationService';
import { CARD_BACK, VOTE_FACE } from '../../assets/cards';
import { DialogDragHandle } from '../../components/DialogDragHandle/DialogDragHandle';
import { useDialogDrag } from '../../components/DialogDragHandle/useDialogDrag';
import styles from './VotingOverlay.module.scss';

const BALLOT_FLIGHT_MS = 480;

export interface VotingOverlayProps {
  formatMessage: FormatMessage;
  /** Already-formatted "Elect X as Chancellor?" prompt. */
  prompt: string;
  /** Living voter who hasn't voted yet — show the Ja/Nein buttons. */
  canVote: boolean;
  yourVote: Vote | null;
  votedCount: number;
  totalVoters: number;
  /** Players whose face-down ballot is already at the table. */
  votedIds: string[];
  youId: string;
  /** Show the vote countdown. The engine always times this phase. */
  showTimer: boolean;
  secondsLeft: number;
  startedAt: number;
  endsAt: number;
  onVote: (vote: Vote) => void;
}

type Ballot = {
  id: string;
  dx: number;
  dy: number;
  rot: number;
  instant: boolean;
};

/**
 * Vote dock at the top of the table, with a public pile of face-down ballots
 * in the centre. Ja / Nein stay on this device; everyone else only sees a
 * back fly from the seat that voted.
 */
export function VotingOverlay(props: VotingOverlayProps) {
  const { formatMessage } = props;
  const { animation, ravi, sound } = useApp();
  const drag = useDialogDrag();
  const [picked, setPicked] = createSignal<Vote | null>(null);
  const [pile, setPile] = createSignal<Ballot[]>([]);
  const chosen = () => props.yourVote ?? picked();
  const showBallot = () => props.canVote || chosen() != null;
  const ballotEls: Record<string, HTMLImageElement | undefined> = {};
  const seen = new Set<string>();
  let primed = false;
  let closed = false;

  const totalMs = Math.max(1, props.endsAt - props.startedAt);
  const elapsedMs = Math.max(0, Date.now() - props.startedAt);
  const timerVars = {
    '--vote-total': `${totalMs}ms`,
    '--vote-elapsed': `${elapsedMs}ms`,
  };
  const timerFallback =
    animation.motionEnabled()
      ? undefined
      : { width: `${Math.max(0, 1 - elapsedMs / totalMs) * 100}%` };

  onCleanup(() => {
    closed = true;
  });

  onMount(() => {
    void ravi.speak('private.vote');
  });

  createEffect(() => {
    const ids = props.votedIds;
    if (!primed) {
      primed = true;
      for (const id of ids) startBallot(id, false);
      return;
    }
    for (const id of ids) startBallot(id, true);
  });

  function startBallot(id: string, fly: boolean): void {
    if (seen.has(id) || closed) return;
    seen.add(id);
    const scatter = scatterFor(id, seen.size - 1);
    setPile((current) => [...current, { id, ...scatter, instant: !fly }]);
    if (!fly) return;
    sound.play('ballot-slide');
    void launchBallot(id, scatter);
  }

  async function launchBallot(
    id: string,
    scatter: Omit<Ballot, 'id' | 'instant'>,
  ): Promise<void> {
    await waitFrames(2);
    if (closed) return;
    await flyBallot(animation, ballotEls[id], seatEl(id), scatter);
  }

  function choose(vote: Vote): void {
    if (chosen() != null) return;
    setPicked(vote);
    sound.play('ballot-tap');
    startBallot(props.youId, true);
    props.onVote(vote);
  }

  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <div class={styles.shift} style={drag.style()}>
      <div
        class={styles.dialog}
        role="dialog"
        aria-modal="true"
        ref={(element) => void animation.play(element, 'pop-in')}
      >
        <DialogDragHandle
          label={formatMessage('game.moveDialog')}
          dragging={drag.dragging()}
          handleProps={drag.handleProps}
        />
        <span class={styles.title}>{formatMessage('game.voteTitle')}</span>
        <p class={styles.prompt}>{props.prompt}</p>

        <Show when={props.showTimer}>
          <div class={styles.timer}>
            <div
              classList={{
                [styles.timerBar]: true,
                [styles.timerBarStatic]: !animation.motionEnabled(),
              }}
              style={{ ...timerVars, ...timerFallback }}
            />
            <span class={styles.timerLabel}>
              {formatMessage('game.secondsLeft', { seconds: props.secondsLeft })}
            </span>
          </div>
        </Show>

        <Show
          when={showBallot()}
          fallback={
            <div class={styles.waiting}>
              <span class={styles.progress}>
                {formatMessage('game.voteProgress', {
                  count: props.votedCount,
                  total: props.totalVoters,
                })}
              </span>
            </div>
          }
        >
          <div class={styles.buttons}>
            <button
              type="button"
              classList={{
                [styles.ja]: true,
                [styles.selected]: chosen() === 'ja',
                [styles.dimmed]: chosen() != null && chosen() !== 'ja',
              }}
              aria-pressed={chosen() == null ? undefined : chosen() === 'ja'}
              disabled={chosen() != null}
              onClick={() => choose('ja')}
            >
              <img class={styles.cardArt} src={VOTE_FACE.ja} alt="" />
              <span>{formatMessage('game.voteJa')}</span>
            </button>
            <button
              type="button"
              classList={{
                [styles.nein]: true,
                [styles.selected]: chosen() === 'nein',
                [styles.dimmed]: chosen() != null && chosen() !== 'nein',
              }}
              aria-pressed={chosen() == null ? undefined : chosen() === 'nein'}
              disabled={chosen() != null}
              onClick={() => choose('nein')}
            >
              <img class={styles.cardArt} src={VOTE_FACE.nein} alt="" />
              <span>{formatMessage('game.voteNein')}</span>
            </button>
          </div>
          <Show when={chosen()}>
            <span class={styles.yourVote}>
              {formatMessage('game.youVoted', {
                vote: formatMessage(`vote.${chosen()!}`),
              })}
            </span>
          </Show>
          <span class={styles.progress}>
            {formatMessage('game.voteProgress', {
              count: props.votedCount,
              total: props.totalVoters,
            })}
          </span>
        </Show>
      </div>
      </div>

      <div class={styles.felt}>
        <div class={styles.pile} data-ballot-pile>
          <For each={pile()}>
            {(ballot) => (
              <img
                classList={{
                  [styles.ballot]: true,
                  [styles.landed]: ballot.instant,
                }}
                src={CARD_BACK}
                alt=""
                data-ballot={ballot.id}
                style={{
                  transform: `translate(${ballot.dx}px, ${ballot.dy}px) rotate(${ballot.rot}deg)`,
                }}
                ref={(element) => {
                  ballotEls[ballot.id] = element;
                }}
              />
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

function scatterFor(id: string, index: number): Omit<Ballot, 'id' | 'instant'> {
  let hash = index * 2654435761;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return {
    rot: (hash % 21) - 10,
    dx: ((hash >> 3) % 13) - 6,
    dy: ((hash >> 7) % 9) - 4,
  };
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

function escapeAttr(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&');
}

function seatEl(playerId: string): Element | null {
  return document.querySelector(`[data-seat-id="${escapeAttr(playerId)}"]`);
}

function centerOf(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function offsetFrom(
  card: HTMLElement,
  origin: Element | null,
): { x: number; y: number } | null {
  if (!origin) return null;
  const from = centerOf(origin);
  const here = centerOf(card);
  return { x: from.x - here.x, y: from.y - here.y };
}

function flyBallot(
  animation: AnimationService,
  card: HTMLImageElement | undefined,
  from: Element | null,
  scatter: Omit<Ballot, 'id' | 'instant'>,
): Promise<void> {
  if (!card) return Promise.resolve();
  const start = offsetFrom(card, from);
  const landed = `translate(${scatter.dx}px, ${scatter.dy}px) rotate(${scatter.rot}deg)`;
  if (!start) {
    card.style.opacity = '1';
    card.style.transform = landed;
    return Promise.resolve();
  }
  return animation
    .playCustom(
      card,
      [
        {
          opacity: 1,
          transform: `translate(${start.x}px, ${start.y}px) scale(0.42) rotate(-18deg)`,
        },
        { opacity: 1, transform: `${landed} scale(1)` },
      ],
      { duration: BALLOT_FLIGHT_MS, easing: 'ease-in-out' },
    )
    .then(() => {
      card.style.opacity = '1';
      card.style.transform = landed;
    });
}
