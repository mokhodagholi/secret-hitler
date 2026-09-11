import { Show } from 'solid-js';
import type { PublicPlayer } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { playerLabel } from '../../i18n/perspective';
import { avatarImage } from '../../assets/avatars';
import { PARTY_FACE } from '../../assets/cards';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import styles from './TableSeat.module.scss';

export interface TableSeatProps {
  player: PublicPlayer;
  isYou: boolean;
  isNext: boolean;
  /** Eligible pick — sways so the President can see who to tap. */
  selectable: boolean;
  /** Previous-government lock: clickable so we can explain why not. */
  termLocked: boolean;
  /** Tap to ask the table to remove this player. */
  reportable?: boolean;
  /** Seat numbers and office ribbons — hidden until the opening night ends. */
  showPublicMarks?: boolean;
  bubble?: string;
  onSelect: () => void;
  formatMessage: FormatMessage;
}

/**
 * One seat at the table: the portrait, a coloured office cloud when
 * this player holds a public office, an investigated party card when this
 * viewer has checked their loyalty, and an optional chat bubble.
 */
export function TableSeat(props: TableSeatProps) {
  const { formatMessage } = props;
  const { flags, voice } = useApp();

  const showPublicMarks = () => props.showPublicMarks !== false;

  const voiceOn = () => flags.enabled('voice');
  const tableMuted = () =>
    voiceOn() && (props.isYou ? voice.selfMuted() : props.player.selfMuted);
  const locallyMuted = () =>
    voiceOn() && !props.isYou && voice.isRemoteMuted(props.player.id);
  const speaking = () =>
    voiceOn() &&
    voice.isSpeaking(props.player.id) &&
    !tableMuted() &&
    !locallyMuted();

  const office = () => {
    if (!showPublicMarks()) return null;
    return props.player.isPresident
      ? 'president'
      : props.player.isChancellor
        ? 'chancellor'
        : null;
  };

  const interactive = () =>
    props.selectable || props.termLocked || props.reportable === true;

  return (
    <button
      type="button"
      classList={{
        [styles.seat]: true,
        [styles.dead]: !props.player.isAlive,
        [styles.offline]: !props.player.connected,
        [styles.you]: props.isYou,
        [styles.selectable]: props.selectable,
        [styles.reportable]: props.reportable === true && !props.selectable,
        [styles.termLocked]: props.termLocked,
        [styles.voted]: props.player.hasVoted,
        [styles.speaking]: speaking(),
        [styles.tableMuted]: tableMuted(),
        [styles.locallyMuted]: locallyMuted(),
      }}
      aria-label={playerLabel(props.isYou, props.player.name, formatMessage)}
      data-seat-id={props.player.id}
      aria-disabled={!interactive()}
      tabIndex={interactive() ? 0 : -1}
      onClick={() => {
        if (interactive()) props.onSelect();
      }}
    >
      <Show when={props.bubble}>
        <span class={styles.bubble} dir="auto">
          {props.bubble}
        </span>
      </Show>

      <Show when={office()}>
        {(kind) => (
          <span
            classList={{
              [styles.office]: true,
              [styles.officePresident]: kind() === 'president',
              [styles.officeChancellor]: kind() === 'chancellor',
            }}
          >
            {formatMessage(
              kind() === 'president' ? 'game.president' : 'game.chancellor',
            )}
          </span>
        )}
      </Show>

      <Show
        when={
          showPublicMarks() &&
          props.isNext &&
          !props.player.isPresident &&
          !office()
        }
      >
        <span class={styles.next}>{formatMessage('game.nextPresident')}</span>
      </Show>

      <span class={styles.paper}>
        <img
          class={styles.face}
          src={avatarImage(props.player.avatar)}
          alt=""
          aria-hidden="true"
        />
        <Show when={showPublicMarks()}>
          <span class={styles.badge} data-seat-number>
            {formatMessage('game.seatNumber', { n: props.player.seat + 1 })}
          </span>
        </Show>
        <Show when={props.player.party}>
          {(party) => (
            <img
              class={styles.party}
              src={PARTY_FACE[party()]}
              alt={formatMessage(
                party() === 'liberal' ? 'game.liberal' : 'game.fascist',
              )}
              data-party={party()}
            />
          )}
        </Show>
        <Show when={tableMuted() || locallyMuted()}>
          <span class={styles.micBadge} aria-hidden="true">
            <Icon name="micOff" size={12} />
          </span>
        </Show>
      </span>
      <span class={styles.name} dir="auto">
        {playerLabel(props.isYou, props.player.name, formatMessage)}
      </span>
    </button>
  );
}
