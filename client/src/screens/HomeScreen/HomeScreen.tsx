import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import { Phase } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import type { SocialIdentity } from '../../services/SocialService';
import heroImage from '../../assets/home/hero.webp';
import heroFindingImage from '../../assets/home/hero-finding.webp';
import deskImage from '../../assets/home/desk.png';
import liberalBoard from '../../assets/boards/liberal.png';
import fascistBoard from '../../assets/boards/fascist.png';
import { MatchHistorySheet } from './MatchHistorySheet';
import styles from './HomeScreen.module.scss';

/** Cycles on the home support chip — same topics as the support letter form. */
const SUPPORT_LABELS = [
  'support.topics.help',
  'support.topics.criticism',
  'support.topics.suggestion',
] as const;

const SUPPORT_ROTATE_MS =
  import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test' ? 50_000 : 2_800;
const SUPPORT_FADE_MS =
  import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test' ? 0 : 220;

/**
 * Lobby splash: Hitler at the desk, Play on the table. Play opens Join
 * (one public salon when that flag is on). A live seat that can still
 * be claimed gets its own return button above Play.
 */
export function HomeScreen() {
  const {
    nav,
    game,
    i18n,
    prefetch,
    animation,
    settings,
    miniApp,
    social,
    tutorial,
  } = useApp();
  const { formatMessage } = i18n;
  const showDevOnboarding = import.meta.env.DEV;

  const canRejoin = () => game.inRoom() && game.view() != null;

  const [historyOpen, setHistoryOpen] = createSignal(false);

  function resolvedName(): string {
    return miniApp.user()?.firstName ?? settings.settings.profileName.trim();
  }

  function socialIdentity(): SocialIdentity {
    return {
      clientId: settings.settings.profileId,
      initData: miniApp.initData(),
      name: resolvedName() || formatMessage('home.guest'),
      avatar: settings.settings.avatar,
      token: game.currentSession()?.token,
    };
  }

  async function openHistory(): Promise<void> {
    setHistoryOpen(true);
    const identity = socialIdentity();
    try {
      await Promise.all([social.load(identity), social.loadHistory(identity)]);
    } catch {
      // Empty list + server error toast from fetch; sheet still opens.
    }
  }

  function rejoinMatch(): void {
    const phase = game.view()?.phase;
    nav.navigate(phase && phase !== Phase.Lobby ? 'game' : 'waiting-room');
  }

  function openDevOnboarding(): void {
    tutorial.startIntro({
      name: resolvedName() || formatMessage('game.you'),
      avatar: settings.settings.avatar,
    });
    nav.navigate('onboarding');
  }

  const [supportIndex, setSupportIndex] = createSignal(0);
  const [supportFading, setSupportFading] = createSignal(false);

  onMount(() => {
    const tick = setInterval(() => {
      if (!animation.motionEnabled() || SUPPORT_FADE_MS === 0) {
        setSupportIndex((index) => (index + 1) % SUPPORT_LABELS.length);
        return;
      }
      setSupportFading(true);
      window.setTimeout(() => {
        setSupportIndex((index) => (index + 1) % SUPPORT_LABELS.length);
        setSupportFading(false);
      }, SUPPORT_FADE_MS);
    }, SUPPORT_ROTATE_MS);
    onCleanup(() => clearInterval(tick));
  });

  return (
    <Screen>
      <div class={styles.home}>
        <div class={styles.tools}>
          <div class={styles.toolStart}>
            <button
              type="button"
              class={styles.supportChip}
              aria-label={formatMessage('support.title')}
              onClick={() => nav.navigate('support')}
            >
              <span
                classList={{
                  [styles.supportLabel]: true,
                  [styles.supportLabelOut]: supportFading(),
                }}
                dir="auto"
              >
                {formatMessage(SUPPORT_LABELS[supportIndex()])}
              </span>
            </button>
          </div>
          <div class={styles.toolEnd}>
            <button
              type="button"
              class={styles.tool}
              aria-label={formatMessage('nav.settings')}
              onClick={() => nav.navigate('settings')}
            >
              <Icon name="gear" size={22} />
            </button>
            <Show when={showDevOnboarding}>
              <button
                type="button"
                class={styles.tool}
                aria-label={formatMessage('home.checkOnboarding')}
                onClick={openDevOnboarding}
              >
                <Icon name="hand" size={22} />
              </button>
            </Show>
            <button
              type="button"
              class={styles.guideChip}
              aria-label={formatMessage('nav.rules')}
              onClick={() => nav.navigate('rules')}
            >
              <Icon name="book" size={16} />
              <span class={styles.guideLabel} dir="auto">
                {formatMessage('nav.rules')}
              </span>
            </button>
            <button
              type="button"
              class={styles.guideChip}
              aria-label={formatMessage('home.history')}
              onClick={() => void openHistory()}
            >
              <Icon name="scroll" size={16} />
              <span class={styles.guideLabel} dir="auto">
                {formatMessage('home.history')}
              </span>
            </button>
          </div>
        </div>

        <div class={styles.stage}>
          <div class={styles.deskWrap}>
            <div
              classList={{
                [styles.hero]: true,
                [styles.heroNoMotion]: !animation.motionEnabled(),
              }}
            >
              <span class={styles.heroHeadShade} aria-hidden="true" />
              <WarmImg class={styles.heroImage} src={heroImage} alt="" />
              <WarmImg
                class={styles.heroImageFinding}
                src={heroFindingImage}
                alt=""
              />
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
          <div class={styles.ctaFind}>
            <button
              type="button"
              class={styles.cta}
              aria-label={formatMessage('home.play')}
              onClick={() => nav.navigate('join-game')}
            >
              <span class={styles.ctaLabel} dir="auto">
                {formatMessage('home.play')}
              </span>
            </button>
          </div>
        </div>
      </div>

      <MatchHistorySheet
        open={historyOpen()}
        identity={socialIdentity()}
        onClose={() => setHistoryOpen(false)}
      />
    </Screen>
  );
}
