import { TypewriterText } from './TypewriterText';
import styles from './GameEventHeader.module.scss';

export interface GameEventHeaderProps {
  headline: string;
}

/**
 * Top-of-board ticker: Ravi's current line, typed onto the parchment.
 */
export function GameEventHeader(props: GameEventHeaderProps) {
  return (
    <header class={styles.header} aria-live="polite">
      <p class={styles.headline} dir="auto">
        <TypewriterText text={props.headline} />
      </p>
    </header>
  );
}
