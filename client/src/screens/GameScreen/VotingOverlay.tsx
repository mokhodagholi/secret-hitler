import { Show, createSignal, onMount } from 'solid-js';
import type { Vote } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { VOTE_FACE } from '../../assets/cards';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import { DialogDragHandle } from '../../components/DialogDragHandle/DialogDragHandle';
import { useDialogDrag } from '../../components/DialogDragHandle/useDialogDrag';
import { GovernmentTicket } from './GovernmentTicket';
import styles from './VotingOverlay.module.scss';

export interface VotingOverlayProps {
  formatMessage: FormatMessage;
  /** Already-formatted "Elect this government?" prompt. */
  prompt: string;
  presidentName: string;
  chancellorName: string;
  presidentAvatar: number;
  chancellorAvatar: number;
  /** Living voter who hasn't voted yet — show the Ja/Nein buttons. */
  canVote: boolean;
  yourVote: Vote | null;
  votedCount: number;
  totalVoters: number;
  youId: string;
  /** Show the vote countdown. The engine always times this phase. */
  showTimer: boolean;
  secondsLeft: number;
  startedAt: number;
  endsAt: number;
  onVote: (vote: Vote) => void;
}

/**
 * Vote prompt at the table. Cast ballots live on each seat; this overlay is
 * only the Ja/Nein dialog (and a waiting clock after this device has voted).
 */
export function VotingOverlay(props: VotingOverlayProps) {
  const { formatMessage } = props;
  const { animation, ravi, sound, tutorial } = useApp();
  const drag = useDialogDrag();
  const [picked, setPicked] = createSignal<Vote | null>(null);
  const chosen = () => props.yourVote ?? picked();
  const showDialog = () => props.canVote && chosen() == null;

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
    if (props.canVote && !tutorial.looking()) void ravi.speak('private.vote');
  });

  function choose(vote: Vote): void {
    if (chosen() != null) return;
    setPicked(vote);
    sound.play('ballot-tap');
    props.onVote(vote);
  }

  const timer = (
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
  );

  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <Show when={showDialog()}>
        <div class={styles.shift} style={drag.style()}>
          <div
            class={styles.dialog}
            role="dialog"
            aria-modal="true"
            data-tutorial-target="vote"
            ref={(element) => void animation.play(element, 'pop-in')}
            {...drag.surfaceProps}
          >
            <DialogDragHandle
              label={formatMessage('game.moveDialog')}
              dragging={drag.dragging()}
              handleProps={drag.handleProps}
            />
            <span class={styles.title}>{formatMessage('game.voteTitle')}</span>
            <GovernmentTicket
              formatMessage={formatMessage}
              presidentName={props.presidentName}
              chancellorName={props.chancellorName}
              presidentAvatar={props.presidentAvatar}
              chancellorAvatar={props.chancellorAvatar}
            />
            <p class={styles.prompt}>{props.prompt}</p>
            {timer}
            <div class={styles.buttons}>
              <button type="button" class={styles.ja} onClick={() => choose('ja')}>
                <WarmImg class={styles.cardArt} src={VOTE_FACE.ja} alt="" />
                <span>{formatMessage('game.voteJa')}</span>
              </button>
              <button
                type="button"
                class={styles.nein}
                onClick={() => choose('nein')}
              >
                <WarmImg class={styles.cardArt} src={VOTE_FACE.nein} alt="" />
                <span>{formatMessage('game.voteNein')}</span>
              </button>
            </div>
            <span class={styles.progress}>
              {formatMessage('game.voteProgress', {
                count: props.votedCount,
                total: props.totalVoters,
              })}
            </span>
          </div>
        </div>
      </Show>

      <Show when={!showDialog()}>
        <div class={styles.waiting}>
          {timer}
          <span class={styles.progress}>
            {formatMessage('game.voteProgress', {
              count: props.votedCount,
              total: props.totalVoters,
            })}
          </span>
        </div>
      </Show>
    </div>
  );
}
