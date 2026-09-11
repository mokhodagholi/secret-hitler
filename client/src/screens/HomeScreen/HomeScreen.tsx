import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import heroImage from '../../assets/home/hero.webp';
import deskImage from '../../assets/home/desk.png';
import liberalBoard from '../../assets/boards/liberal.png';
import fascistBoard from '../../assets/boards/fascist.png';
import styles from './HomeScreen.module.scss';

/**
 * Lobby splash: Hitler at the desk, Find Game on the table, rules and
 * settings as a brass pair in the top-right corner.
 */
export function HomeScreen() {
  const { nav, i18n } = useApp();
  const { formatMessage } = i18n;

  const enterPlay = () => nav.navigate('play');

  return (
    <Screen>
      <div class={styles.home}>
        <div class={styles.tools}>
          <button
            type="button"
            class={styles.tool}
            aria-label={formatMessage('nav.rules')}
            onClick={() => nav.navigate('rules')}
          >
            <Icon name="scroll" size={22} />
          </button>
          <button
            type="button"
            class={styles.tool}
            aria-label={formatMessage('nav.settings')}
            onClick={() => nav.navigate('settings')}
          >
            <Icon name="gear" size={22} />
          </button>
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
