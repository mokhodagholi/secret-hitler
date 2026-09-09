import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import avatarCard from '../../assets/avatars/avatar_placeholder.png';
import avatarPortrait from '../../assets/avatars/avatar_1.png';
import heroImage from '../../assets/home/hero.png';
import deskImage from '../../assets/home/desk.png';
import liberalBoard from '../../assets/boards/liberal.png';
import fascistBoard from '../../assets/boards/fascist.png';
import starIcon from '../../assets/home/star.png';
import gemIcon from '../../assets/home/gem.png';
import plusIcon from '../../assets/home/plus.png';
import styles from './HomeScreen.module.scss';

/**
 * Lobby splash modeled on the game mockup: a 3D menu button in the header, the
 * player's framed portrait to the left of the hero, the hero over a wooden desk
 * holding the policy boards, and the primary CTA. Tapping the menu opens settings.
 */
export function HomeScreen() {
  const { nav, i18n } = useApp();
  const { formatMessage } = i18n;

  const enterPlay = () => nav.navigate('play');

  return (
    <Screen>
      <div class={styles.home}>
        <header class={styles.statusBar}>
          <div class={styles.resources} aria-hidden="true">
            <div class={styles.pill}>
              <img class={styles.pillIcon} src={starIcon} alt="" />
              <span class={styles.pillValue}>3.3K</span>
              <img class={styles.pillPlus} src={plusIcon} alt="" />
            </div>
            <div class={styles.pill}>
              <img class={styles.pillIcon} src={gemIcon} alt="" />
              <span class={styles.pillValue}>3.3K</span>
              <img class={styles.pillPlus} src={plusIcon} alt="" />
            </div>
          </div>

          <button
            type="button"
            class={styles.menuButton}
            aria-label={formatMessage('nav.settings')}
            onClick={() => nav.navigate('settings')}
          >
            <Icon name="menu" size={22} />
          </button>
        </header>

        <div class={styles.profileRow}>
          <div class={styles.avatarCard} aria-hidden="true">
            <img class={styles.avatarCardFrame} src={avatarCard} alt="" />
            <img class={styles.avatarPortrait} src={avatarPortrait} alt="" />
          </div>
          <span class={styles.namePlate} dir="auto">
            {formatMessage('home.guest')}
          </span>
        </div>

        <div class={styles.stage}>
          <div class={styles.deskWrap}>
            <img class={styles.heroImage} src={heroImage} alt="" />
            <img class={styles.desk} src={deskImage} alt="" />
            <div class={styles.boards} aria-hidden="true">
              <img class={styles.board} src={liberalBoard} alt="" />
              <img class={styles.board} src={fascistBoard} alt="" />
            </div>
          </div>
        </div>

        <div class={styles.ctaWrap}>
          <button type="button" class={styles.cta} onClick={enterPlay}>
            <span class={styles.ctaLabel} dir="auto">
              {formatMessage('home.findGame')}
            </span>
          </button>
        </div>
      </div>
    </Screen>
  );
}
