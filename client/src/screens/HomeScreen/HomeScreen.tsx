import { Show } from 'solid-js';
import { Phase } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import heroImage from '../../assets/home/hero.webp';
import deskImage from '../../assets/home/desk.png';
import liberalBoard from '../../assets/boards/liberal.png';
import fascistBoard from '../../assets/boards/fascist.png';
import styles from './HomeScreen.module.scss';

/**
 * Lobby splash: Hitler at the desk, Find Game on the table, rules and
 * settings as a brass pair in the top-right corner. A live seat that
 * can still be claimed gets its own return button above Find Game.
 */
export function HomeScreen() {
  const { nav, game, i18n, prefetch } = useApp();
  const { formatMessage } = i18n;

  const canRejoin = () => game.inRoom() && game.view() != null;

  const enterPlay = () => nav.navigate('join-game');

  function rejoinMatch(): void {
    const phase = game.view()?.phase;
    nav.navigate(phase && phase !== Phase.Lobby ? 'game' : 'waiting-room');
  }

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
            <Icon name="book" size={22} />
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
              <WarmImg class={styles.heroImage} src={heroImage} alt="" />
              <span
                class={styles.heroBellyShade}
                aria-hidden="true"
                style={{
                  'mask-image': `url("${prefetch.src(heroImage)}")`,
                  '-webkit-mask-image': `url("${prefetch.src(heroImage)}")`,
                }}
              />
            </div>
            <WarmImg class={styles.desk} src={deskImage} alt="" />
            <div class={styles.boards} aria-hidden="true">
              <WarmImg class={styles.board} src={liberalBoard} alt="" />
              <WarmImg class={styles.board} src={fascistBoard} alt="" />
            </div>
          </div>
        </div>

        <div class={styles.ctaWrap}>
          <Show when={canRejoin()}>
            <button type="button" class={styles.ctaRejoin} onClick={rejoinMatch}>
              <span class={styles.ctaRejoinLabel} dir="auto">
                {formatMessage('home.rejoin')}
              </span>
            </button>
          </Show>
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
