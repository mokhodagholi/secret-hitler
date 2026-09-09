import { Show } from 'solid-js';
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
  /** Show the countdown bar (the room's Timer setting is enabled). */
  showTimer: boolean;
  secondsLeft: number;
  /** Fraction of the window remaining, 0–1. */
  progress: number;
  onVote: (vote: Vote) => void;
}

/** Full-screen timed Ja/Nein agreement screen shown during the Voting phase. */
export function VotingOverlay(props: VotingOverlayProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
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
            <div class={styles.timerBar} style={{ width: `${props.progress * 100}%` }} />
            <span class={styles.timerLabel}>
              {formatMessage('game.secondsLeft', { seconds: props.secondsLeft })}
            </span>
          </div>
        </Show>

        <Show
          when={props.canVote}
          fallback={
            <div class={styles.waiting}>
              <Show when={props.yourVote}>
                <span class={styles.yourVote}>
                  {formatMessage('game.youVoted', {
                    vote: formatMessage(`vote.${props.yourVote!}`),
                  })}
                </span>
              </Show>
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
              class={styles.ja}
              onClick={() => props.onVote('ja')}
            >
              <img class={styles.cardArt} src={VOTE_FACE.ja} alt="" />
              <span>{formatMessage('game.voteJa')}</span>
            </button>
            <button
              type="button"
              class={styles.nein}
              onClick={() => props.onVote('nein')}
            >
              <img class={styles.cardArt} src={VOTE_FACE.nein} alt="" />
              <span>{formatMessage('game.voteNein')}</span>
            </button>
          </div>
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
