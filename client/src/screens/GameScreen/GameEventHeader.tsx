import { TypewriterText } from './TypewriterText';
import styles from './GameEventHeader.module.scss';

export interface GameEventHeaderProps {
  headline: string;
  /** Spoken length for the current Ravi line — drives typewriter pace. */
  durationMs?: number;
  /** False while this line is still typing, true when it is fully on the parchment. */
  onTyped?: (done: boolean, text: string) => void;
}

/**
 * Top-of-board ticker: Ravi's current line, typed onto the parchment.
 */
export function GameEventHeader(props: GameEventHeaderProps) {
  return (
    <header class={styles.header} aria-live="polite">
      <p class={styles.headline} dir="auto">
        <TypewriterText
          text={props.headline}
          durationMs={props.durationMs}
          onTyped={props.onTyped}
        />
      </p>
    </header>
  );
}
