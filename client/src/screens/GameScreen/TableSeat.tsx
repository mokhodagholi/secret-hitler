import { Show, createEffect } from 'solid-js';
import type { PublicPlayer, Vote } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { playerLabel } from '../../i18n/perspective';
import { avatarImage } from '../../assets/avatars';
import { PARTY_FACE, VOTE_BACK, VOTE_FACE } from '../../assets/cards';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import styles from './TableSeat.module.scss';

export interface TableSeatProps {
  player: PublicPlayer;
  isYou: boolean;
  isNext: boolean;
  /** Eligible pick — sways so the President can see who to tap. */
  selectable: boolean;
  /** Previous-government lock: clickable so we can explain why not. */
  termLocked: boolean;
  /** Tap opens the player sheet (report / mute) when no table action applies. */
  reportable?: boolean;
  /** Seat numbers and office ribbons — hidden until the opening night ends. */
  showPublicMarks?: boolean;
  bubble?: string;
  /** Face-down or revealed election ballot sitting on this seat. */
  ballot?: Vote | 'back' | null;
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
  const { flags, voice, sound } = useApp();
  let lastBallot: Vote | 'back' | null = null;

  createEffect(() => {
    const next = props.ballot ?? null;
    if (next && lastBallot == null) sound.play('ballot-slide');
    if ((next === 'ja' || next === 'nein') && lastBallot === 'back') {
      sound.play('card-flip');
    }
    lastBallot = next;
  });

  const showPublicMarks = () => props.showPublicMarks !== false;

  const voiceOn = () => flags.flags.voice;
  const tableMuted = () => voiceOn() && voice.isTableMuted(props.player.id);
  const locallyMuted = () =>
    voiceOn() && !props.isYou && voice.isRemoteMuted(props.player.id);
  const speaking = () =>
    voiceOn() && voice.ui.speaking[props.player.id] === true;
  const micOpen = () => voiceOn() && !tableMuted();

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
      data-speaking={speaking() ? 'true' : undefined}
      data-mic={voiceOn() ? (tableMuted() ? 'off' : 'live') : undefined}
      data-local-mute={locallyMuted() ? 'true' : undefined}
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

      <span class={styles.paper} data-seat-target>
        <WarmImg
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
        <Show when={props.ballot}>
          {(card) => (
            <WarmImg
              class={styles.ballot}
              src={card() === 'back' ? VOTE_BACK : VOTE_FACE[card()]}
              alt=""
              data-seat-ballot={props.player.id}
              data-ballot={props.player.id}
              data-ballot-face={card() === 'back' ? 'back' : 'face'}
            />
          )}
        </Show>
        <Show when={props.player.party}>
          {(party) => (
            <WarmImg
              class={styles.party}
              src={PARTY_FACE[party()]}
              alt={formatMessage(
                party() === 'liberal' ? 'game.liberal' : 'game.fascist',
              )}
              data-party={party()}
            />
          )}
        </Show>
        <Show when={tableMuted()}>
          <span class={styles.micBadge} aria-hidden="true">
            <Icon name="micOff" size={12} />
          </span>
        </Show>
        <Show when={micOpen()}>
          <span
            classList={{ [styles.micBadge]: true, [styles.micLive]: true }}
            aria-hidden="true"
          >
            <Icon name="mic" size={12} />
          </span>
        </Show>
        <Show when={locallyMuted()}>
          <span
            classList={{ [styles.micBadge]: true, [styles.micLocal]: true }}
            aria-hidden="true"
          >
            <Icon name="speakerOff" size={12} />
          </span>
        </Show>
      </span>
      <span class={styles.name}>
        <Show when={showPublicMarks()}>
          <span class={styles.nameNumber} data-seat-number>
            {formatMessage('game.seatNumber', { n: props.player.seat + 1 })}
          </span>
        </Show>
        <span dir="auto">
          {playerLabel(props.isYou, props.player.name, formatMessage)}
        </span>
      </span>
    </button>
  );
}
