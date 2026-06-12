import { Show, createEffect, on } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { avatarImage } from '../../assets/avatars';
import { Icon } from '../../components/Icon/Icon';
import styles from './TurnBanner.module.scss';

export interface TurnBannerProps {
  /** Whose discussion turn it is. */
  speakerId: string;
  name: string;
  avatar: number;
  secondsLeft: number;
  isMyTurn: boolean;
  onEndTurn: () => void;
  formatMessage: FormatMessage;
}

/**
 * The active player's turn, above the board: profile, name and countdown,
 * with an End Turn button on your own turn. Each handoff slides the new
 * speaker in (the previous one is replaced).
 */
export function TurnBanner(props: TurnBannerProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  let bannerElement: HTMLDivElement | undefined;

  // Replay the slide-in whenever the talking stick moves to a new player.
  createEffect(
    on(
      () => props.speakerId,
      () => void animation.play(bannerElement, 'turn-enter'),
    ),
  );

  return (
    <div class={styles.banner} ref={bannerElement}>
      <span class={styles.avatar}>
        <img src={avatarImage(props.avatar)} alt="" aria-hidden="true" />
      </span>
      <div class={styles.info}>
        <span class={styles.label}>{formatMessage('game.currentTurn')}</span>
        <span class={styles.name}>{props.name}</span>
      </div>
      <span
        classList={{
          [styles.timer]: true,
          [styles.urgent]: props.secondsLeft <= 4,
          [styles.pulse]: props.secondsLeft <= 4 && animation.motionEnabled(),
        }}
      >
        <Icon name="clock" size={14} />
        {formatMessage('game.secondsLeft', { seconds: props.secondsLeft })}
      </span>
      <Show when={props.isMyTurn}>
        <button
          type="button"
          class={styles.endTurn}
          onClick={() => props.onEndTurn()}
        >
          {formatMessage('game.endTurn')}
        </button>
      </Show>
    </div>
  );
}
