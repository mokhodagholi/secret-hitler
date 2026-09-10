import { Show, createSignal, onMount } from 'solid-js';
import type { Vote } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { VOTE_FACE } from '../../assets/cards';
import styles from './VotingOverlay.module.scss';

export interface VotingOverlayProps {
  formatMessage: FormatMessage;
  /** Already-formatted "Elect X as Chancellor?" prompt. */
  prompt: string;
  /** Living voter who hasn't voted yet — show the Ja/Nein buttons. */
  canVote: boolean;
  yourVote: Vote | null;
  votedCount: number;
  totalVoters: number;
  /** Show the vote countdown. The engine always times this phase. */
  showTimer: boolean;
  secondsLeft: number;
  startedAt: number;
  endsAt: number;
  onVote: (vote: Vote) => void;
}

/** Full-screen timed Ja/Nein agreement screen shown during the Voting phase. */
export function VotingOverlay(props: VotingOverlayProps) {
  const { formatMessage } = props;
  const { animation, ravi, sound } = useApp();
  const [picked, setPicked] = createSignal<Vote | null>(null);
  const chosen = () => props.yourVote ?? picked();
  const showBallot = () => props.canVote || chosen() != null;

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

  onMount(() => {
    void ravi.speak('private.vote');
  });
  function choose(vote: Vote): void {
    if (chosen() != null) return;
    setPicked(vote);
    sound.play('ballot-tap');
    props.onVote(vote);
  }
  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <div
        class={styles.dialog}
        role="dialog"
        aria-modal="true"
        ref={(element) => void animation.play(element, 'pop-in')}
      >
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
  );
}
