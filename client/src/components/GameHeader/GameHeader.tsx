import { useApp } from '../../services/AppContext';
import { avatarImage } from '../../assets/avatars';
import gemIcon from '../../assets/home/gem.png';
import starIcon from '../../assets/home/star.png';
import styles from './GameHeader.module.scss';

export interface GameHeaderProps {
  gems?: string;
  stars?: string;
}

export function GameHeader(props: GameHeaderProps) {
  const { settings } = useApp();
  return (
    <header class={styles.header}>
      <div class={styles.profile}>
        <span class={styles.avatar}>
          <img
            class={styles.avatarImage}
            src={avatarImage(settings.settings.avatar)}
            alt=""
          />
        </span>
      </div>

      <div class={styles.currencyGroup} aria-hidden="true">
        <div class={styles.currency}>
          <img src={gemIcon} alt="" />
          <span>{props.gems ?? '1,200'}</span>
        </div>
        <div class={styles.currency}>
          <img src={starIcon} alt="" />
          <span>{props.stars ?? '35,800'}</span>
        </div>
      </div>
    </header>
  );
}
