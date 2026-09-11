import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { avatarImage } from '../../assets/avatars';
import heroImage from '../../assets/home/hero.webp';
import deskImage from '../../assets/home/desk.png';
import liberalBoard from '../../assets/boards/liberal.png';
import fascistBoard from '../../assets/boards/fascist.png';
import styles from './HomeScreen.module.scss';

/**
 * Lobby splash: player-card portrait at the top, settings still top-right,
 * قوانین hanging under the key.
 */
export function HomeScreen() {
  const { nav, i18n, settings } = useApp();
  const { formatMessage } = i18n;

  const enterPlay = () => nav.navigate('play');

  return (
    <Screen>
      <div class={styles.home}>
        <div class={styles.profileRow}>
          <button
            type="button"
            class={styles.avatarCard}
            aria-label={formatMessage('home.chooseCard')}
            onClick={() => nav.navigate('player-cards')}
          >
            <img
              class={styles.avatarPortrait}
              src={avatarImage(settings.settings.avatar)}
              alt=""
            />
          </button>
          <div class={styles.topRight}>
            <button
              type="button"
              class={styles.settingsButton}
              aria-label={formatMessage('nav.settings')}
              onClick={() => nav.navigate('settings')}
            >
              <Icon name="gear" size={22} />
            </button>
            <button
              type="button"
              class={styles.rulesLink}
              onClick={() => nav.navigate('rules')}
            >
              <Icon name="scroll" size={16} class={styles.rulesIcon} />
              <span class={styles.rulesLabel}>
                <span class={styles.flourish} aria-hidden="true" />
                <span dir="auto">{formatMessage('nav.rules')}</span>
                <span class={styles.flourish} aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>

        <div class={styles.stage}>
          <div class={styles.deskWrap}>
            <div class={styles.hero}>
              <span class={styles.heroHeadShade} aria-hidden="true" />
              <img class={styles.heroImage} src={heroImage} alt="" />
              <span
                class={styles.heroBellyShade}
                aria-hidden="true"
                style={{
                  'mask-image': `url("${heroImage}")`,
                  '-webkit-mask-image': `url("${heroImage}")`,
                }}
              />
            </div>
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
