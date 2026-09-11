import { Show, createSignal } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { DialogDragHandle } from '../../components/DialogDragHandle/DialogDragHandle';
import { useDialogDrag } from '../../components/DialogDragHandle/useDialogDrag';
import { VOTE_FACE } from '../../assets/cards';
import styles from './VotingOverlay.module.scss';
import kickStyles from './KickVoteOverlay.module.scss';

export interface KickVoteOverlayProps {
  formatMessage: FormatMessage;
  prompt: string;
  canVote: boolean;
  yourVote: boolean | null;
  votedCount: number;
  totalVoters: number;
  secondsLeft: number;
  startedAt: number;
  endsAt: number;
  onVote: (agree: boolean) => void;
}

/**
 * Table vote to remove a player. Game clocks underneath are frozen until
 * this overlay closes.
 */
export function KickVoteOverlay(props: KickVoteOverlayProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  const drag = useDialogDrag();
  const [picked, setPicked] = createSignal<boolean | null>(null);
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

  function choose(agree: boolean): void {
    if (chosen() != null) return;
    setPicked(agree);
    props.onVote(agree);
  }

  return (
    <div class={kickStyles.backdrop}>
      <div class={styles.shift} style={drag.style()}>
        <div
          class={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-label={formatMessage('game.kickVote.title')}
          ref={(element) => void animation.play(element, 'pop-in')}
        >
          <DialogDragHandle
            label={formatMessage('game.moveDialog')}
            dragging={drag.dragging()}
            handleProps={drag.handleProps}
          />
          <span class={styles.title}>{formatMessage('game.kickVote.title')}</span>
          <p class={styles.prompt}>{props.prompt}</p>

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
                  [styles.selected]: chosen() === true,
                  [styles.dimmed]: chosen() != null && chosen() !== true,
                }}
                aria-pressed={chosen() == null ? undefined : chosen() === true}
                disabled={chosen() != null}
                onClick={() => choose(true)}
              >
                <img class={styles.cardArt} src={VOTE_FACE.ja} alt="" />
                <span>{formatMessage('game.voteJa')}</span>
              </button>
              <button
                type="button"
                classList={{
                  [styles.nein]: true,
                  [styles.selected]: chosen() === false,
                  [styles.dimmed]: chosen() != null && chosen() !== false,
                }}
                aria-pressed={chosen() == null ? undefined : chosen() === false}
                disabled={chosen() != null}
                onClick={() => choose(false)}
              >
                <img class={styles.cardArt} src={VOTE_FACE.nein} alt="" />
                <span>{formatMessage('game.voteNein')}</span>
              </button>
            </div>
            <Show when={chosen() != null}>
              <span class={styles.yourVote}>
                {formatMessage('game.youVoted', {
                  vote: formatMessage(chosen() ? 'vote.ja' : 'vote.nein'),
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
    </div>
  );
}
