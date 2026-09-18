import { Show, createSignal, onMount } from 'solid-js';
import type { Vote } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { VOTE_FACE } from '../../assets/cards';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import { DialogDragHandle } from '../../components/DialogDragHandle/DialogDragHandle';
import { useDialogDrag } from '../../components/DialogDragHandle/useDialogDrag';
import { GovernmentTicket } from './GovernmentTicket';
import { commitOnPress } from './commitOnPress';
import styles from './VotingOverlay.module.scss';

export interface VotingOverlayProps {
  formatMessage: FormatMessage;
  presidentName: string;
  chancellorName: string;
  presidentAvatar: number;
  chancellorAvatar: number;
  /** Living voter who hasn't voted yet — show the Ja/Nein buttons. */
  canVote: boolean;
  yourVote: Vote | null;
  /** False leaves the dialog open (wrong tutorial ballot). */
  onVote: (vote: Vote) => boolean | void;
}

/**
 * Vote prompt at the table: the ticket and Ja/Nein cards. Cast ballots live
 * on each seat; the clock lives in the chat chrome.
 */
export function VotingOverlay(props: VotingOverlayProps) {
  const { formatMessage } = props;
  const { animation, ravi, sound, tutorial } = useApp();
  const drag = useDialogDrag();
  const [picked, setPicked] = createSignal<Vote | null>(null);
  const chosen = () => props.yourVote ?? picked();
  const showDialog = () => props.canVote && chosen() == null;

  onMount(() => {
    if (props.canVote && !tutorial.looking() && !tutorial.playing()) {
      void ravi.speak('private.vote');
    }
  });

  function choose(vote: Vote): void {
    if (chosen() != null) return;
    if (!tutorial.looking()) sound.play('ballot-tap');
    if (props.onVote(vote) === false) return;
    setPicked(vote);
  }

  return (
    <Show when={showDialog()}>
      <div
        class={styles.backdrop}
        ref={(element) => void animation.play(element, 'fade-in')}
      >
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
            <Show when={!tutorial.looking()}>
              <GovernmentTicket
                formatMessage={formatMessage}
                presidentName={props.presidentName}
                chancellorName={props.chancellorName}
                presidentAvatar={props.presidentAvatar}
                chancellorAvatar={props.chancellorAvatar}
              />
            </Show>
            <div class={styles.buttons}>
              <button type="button" class={styles.ja} {...commitOnPress(() => choose('ja'))}>
                <WarmImg class={styles.cardArt} src={VOTE_FACE.ja} alt="" />
                <span>{formatMessage('game.voteJa')}</span>
              </button>
              <button
                type="button"
                class={styles.nein}
                {...commitOnPress(() => choose('nein'))}
              >
                <WarmImg class={styles.cardArt} src={VOTE_FACE.nein} alt="" />
                <span>{formatMessage('game.voteNein')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
