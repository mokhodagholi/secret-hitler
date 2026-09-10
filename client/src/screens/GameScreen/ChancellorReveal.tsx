import { onMount } from 'solid-js';
import { useApp } from '../../services/AppContext';
import type { FormatMessage } from '../../i18n';
import { avatarImage } from '../../assets/avatars';
import styles from './ChancellorReveal.module.scss';

export interface ChancellorRevealProps {
  chancellorName: string;
  chancellorAvatar: number;
  isYou: boolean;
  formatMessage: FormatMessage;
}

/**
 * Beat between nomination and the vote: a short notice of who was named.
 */
export function ChancellorReveal(props: ChancellorRevealProps) {
  const { formatMessage } = props;
  const { animation, sound } = useApp();
  onMount(() => sound.play('chancellor-seal'));
  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <div
        class={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={formatMessage(
          props.isYou
            ? 'game.chancellorRevealTitleYou'
            : 'game.chancellorRevealTitle',
        )}
        ref={(element) => void animation.play(element, 'pop-in')}
      >
        <span class={styles.title}>
          {formatMessage(
            props.isYou
              ? 'game.chancellorRevealTitleYou'
              : 'game.chancellorRevealTitle',
          )}
        </span>
        <img
          class={styles.face}
          src={avatarImage(props.chancellorAvatar)}
          alt=""
        />
        <p class={styles.prompt}>
          {props.isYou
            ? formatMessage('game.chancellorRevealYou')
            : formatMessage('game.chancellorReveal', {
                name: props.chancellorName,
              })}
        </p>
      </div>
    </div>
  );
}
