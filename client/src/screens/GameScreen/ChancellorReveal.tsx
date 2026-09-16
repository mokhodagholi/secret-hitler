import { onMount } from 'solid-js';
import { useApp } from '../../services/AppContext';
import type { FormatMessage } from '../../i18n';
import { DialogDragHandle } from '../../components/DialogDragHandle/DialogDragHandle';
import { useDialogDrag } from '../../components/DialogDragHandle/useDialogDrag';
import { GovernmentTicket } from './GovernmentTicket';
import styles from './ChancellorReveal.module.scss';

export interface ChancellorRevealProps {
  presidentName: string;
  chancellorName: string;
  presidentAvatar: number;
  chancellorAvatar: number;
  presidentIsYou: boolean;
  chancellorIsYou: boolean;
  formatMessage: FormatMessage;
}

/**
 * Beat between nomination and the vote: both offices on the proposed ticket.
 */
export function ChancellorReveal(props: ChancellorRevealProps) {
  const { formatMessage } = props;
  const { animation, sound } = useApp();
  const drag = useDialogDrag();
  const youOnTicket = () => props.presidentIsYou || props.chancellorIsYou;
  onMount(() => sound.play('chancellor-seal'));
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
        aria-label={formatMessage(
          youOnTicket()
            ? 'game.chancellorRevealTitleYou'
            : 'game.chancellorRevealTitle',
        )}
        ref={(element) => void animation.play(element, 'pop-in')}
        {...drag.surfaceProps}
      >
        <DialogDragHandle
          label={formatMessage('game.moveDialog')}
          dragging={drag.dragging()}
          handleProps={drag.handleProps}
        />
        <span class={styles.title}>
          {formatMessage(
            youOnTicket()
              ? 'game.chancellorRevealTitleYou'
              : 'game.chancellorRevealTitle',
          )}
        </span>
        <GovernmentTicket
          formatMessage={formatMessage}
          presidentName={props.presidentName}
          chancellorName={props.chancellorName}
          presidentAvatar={props.presidentAvatar}
          chancellorAvatar={props.chancellorAvatar}
        />
        <p class={styles.prompt}>
          {formatMessage(
            props.presidentIsYou
              ? 'game.chancellorRevealYouPresident'
              : props.chancellorIsYou
                ? 'game.chancellorRevealYou'
                : 'game.chancellorReveal',
            {
              president: props.presidentName,
              chancellor: props.chancellorName,
            },
          )}
        </p>
      </div>
      </div>
    </div>
  );
}
