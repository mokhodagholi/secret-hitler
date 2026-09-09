import type { FormatMessage } from '../../i18n';
import styles from './GameEventHeader.module.scss';

export interface GameEventHeaderProps {
  headline: string;
  governmentLabel: string;
}

const GOVERNMENT_KEYS = [
  'game.government.first',
  'game.government.second',
  'game.government.third',
  'game.government.fourth',
  'game.government.fifth',
  'game.government.sixth',
  'game.government.seventh',
  'game.government.eighth',
  'game.government.ninth',
  'game.government.tenth',
  'game.government.eleventh',
  'game.government.twelfth',
] as const satisfies readonly MessageKey[];

/** Which government is in play: enacted policies + the current cabinet. */
export function governmentLabel(
  enactedCount: number,
  formatMessage: FormatMessage,
): string {
  const key = GOVERNMENT_KEYS[enactedCount];
  return key
    ? formatMessage(key)
    : formatMessage('game.government.nth', { n: enactedCount + 1 });
}

/**
 * Top-of-board ticker: the current instruction, and which government this is.
 */
export function GameEventHeader(props: GameEventHeaderProps) {
  return (
    <header class={styles.header} aria-live="polite">
      <p class={styles.headline} dir="auto">
        {props.headline}
      </p>
      <span class={styles.divider} aria-hidden="true" />
      <div class={styles.government}>
        <span class={styles.governmentLabel} dir="auto">
          {props.governmentLabel}
        </span>
        <SunMark />
      </div>
    </header>
  );
}

function SunMark() {
  return (
    <svg class={styles.sun} viewBox="0 0 32 32" aria-hidden="true">
      <polygon points="16.00,0.50 18.87,9.07 26.96,5.04 22.93,13.13 31.50,16.00 22.93,18.87 26.96,26.96 18.87,22.93 16.00,31.50 13.13,22.93 5.04,26.96 9.07,18.87 0.50,16.00 9.07,13.13 5.04,5.04 13.13,9.07" />
      <circle cx="16" cy="16" r="6.5" />
    </svg>
  );
}
