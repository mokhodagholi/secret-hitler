import { onCleanup, onMount } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { flyRibbon, officeAnchor } from './cardFlight';
import styles from './OfficeHandoffOverlay.module.scss';

export interface OfficeHandoffOverlayProps {
  fromId: string | null;
  toId: string;
  kind: 'president' | 'chancellor';
  /** Special election vs normal clockwise pass. */
  special: boolean;
  formatMessage: FormatMessage;
  onDone: () => void;
}

/**
 * Office ribbon flies from the previous seat onto the next holder so the
 * table can follow the handoff. Lands on the seat's office anchor — not the
 * portrait centre.
 */
export function OfficeHandoffOverlay(props: OfficeHandoffOverlayProps) {
  const { formatMessage } = props;
  const { animation, sound } = useApp();
  let placard: HTMLSpanElement | undefined;
  let closed = false;

  onCleanup(() => {
    closed = true;
  });

  onMount(() => {
    void animation.enqueue(async () => {
      if (closed || !placard) return;
      const from = props.fromId ? officeAnchor(props.fromId) : null;
      const to = officeAnchor(props.toId);
      sound.play(props.kind === 'president' ? 'president-seal' : 'chancellor-seal');
      await flyRibbon(animation, placard, from, to);
      if (!closed) props.onDone();
    });
  });

  return (
    <div class={styles.stage} aria-hidden="true">
      <span
        ref={(element) => {
          placard = element;
        }}
        classList={{
          [styles.placard]: true,
          [styles.president]: props.kind === 'president',
          [styles.chancellor]: props.kind === 'chancellor',
          [styles.special]: props.special,
        }}
        data-office-handoff={props.kind}
      >
        {formatMessage(
          props.kind === 'president' ? 'game.president' : 'game.chancellor',
        )}
      </span>
    </div>
  );
}
