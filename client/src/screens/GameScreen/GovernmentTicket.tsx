import type { FormatMessage } from '../../i18n';
import { avatarImage } from '../../assets/avatars';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import styles from './GovernmentTicket.module.scss';

export interface GovernmentTicketProps {
  presidentName: string;
  chancellorName: string;
  presidentAvatar: number;
  chancellorAvatar: number;
  formatMessage: FormatMessage;
}

/**
 * President and Chancellor as one ticket — the vote is on both offices, not
 * only the nominee.
 */
export function GovernmentTicket(props: GovernmentTicketProps) {
  const { formatMessage } = props;
  return (
    <div class={styles.ticket}>
      <figure class={styles.office}>
        <WarmImg
          class={styles.face}
          src={avatarImage(props.presidentAvatar)}
          alt=""
        />
        <figcaption>
          <span class={styles.role}>{formatMessage('game.president')}</span>
          <span class={styles.name} dir="auto">
            {props.presidentName}
          </span>
        </figcaption>
      </figure>
      <span class={styles.amp} aria-hidden="true">
        &
      </span>
      <figure class={styles.office}>
        <WarmImg
          class={styles.face}
          src={avatarImage(props.chancellorAvatar)}
          alt=""
        />
        <figcaption>
          <span class={styles.role}>{formatMessage('game.chancellor')}</span>
          <span class={styles.name} dir="auto">
            {props.chancellorName}
          </span>
        </figcaption>
      </figure>
    </div>
  );
}
