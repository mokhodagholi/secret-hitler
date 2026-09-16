import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import {
  Phase,
  PUBLIC_TABLE_MAX_PLAYERS,
  type RoomSummary,
} from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import heroImage from '../../assets/home/hero.webp';
import deskImage from '../../assets/home/desk.png';
import liberalBoard from '../../assets/boards/liberal.png';
import fascistBoard from '../../assets/boards/fascist.png';
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
const PUBLIC_TABLE_POLL_MS =
  import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test' ? 50_000 : 4_000;

/**
 * Lobby splash: Hitler at the desk, Find Match on the table, Play with
 * friends under Support. A live seat that can still be claimed gets its
 * own return button above Find Match.
 */
export function HomeScreen() {
  const { nav, game, i18n, prefetch, animation, settings, miniApp } = useApp();
  const { formatMessage } = i18n;

  const canRejoin = () => game.inRoom() && game.view() != null;

  const [publicTable, setPublicTable] = createSignal<RoomSummary | null>(null);
  const [joining, setJoining] = createSignal(false);

  const seatedCount = () => publicTable()?.playerCount ?? 0;
  const maxSeats = () => publicTable()?.maxPlayers ?? PUBLIC_TABLE_MAX_PLAYERS;

  async function refreshPublicTable(): Promise<void> {
    try {
      const listed = await game.listRooms();
      setPublicTable(listed.find((room) => room.kind === 'public') ?? null);
    } catch {
      /* keep the last occupancy we painted */
    }
  }

  function resolvedName(): string {
    return miniApp.user()?.firstName ?? settings.settings.profileName.trim();
  }

  async function enterMatch(): Promise<void> {
    if (joining()) return;
    const table = publicTable();
    if (table && game.currentSession()?.roomId === table.id) {
      nav.navigate(game.view()?.phase === Phase.Lobby ? 'waiting-room' : 'game');
      return;
    }
    const joinable =
      table != null &&
      table.phase === Phase.Lobby &&
      table.playerCount < table.maxPlayers;
    const name = resolvedName();
    if (!table || !joinable || name.length === 0) {
      nav.navigate('join-game');
      return;
    }
    setJoining(true);
    try {
      await game.joinRoom(table.id, {
        name,
        avatar: settings.settings.avatar,
        clientId: settings.settings.profileId,
        initData: miniApp.initData(),
      });
      nav.navigate('waiting-room');
    } catch {
      nav.navigate('join-game');
    } finally {
      setJoining(false);
    }
  }

  function rejoinMatch(): void {
    const phase = game.view()?.phase;
    nav.navigate(phase && phase !== Phase.Lobby ? 'game' : 'waiting-room');
  }

  const [supportIndex, setSupportIndex] = createSignal(0);
  const [supportFading, setSupportFading] = createSignal(false);

  onMount(() => {
    void refreshPublicTable();
    const poll = setInterval(() => {
      void refreshPublicTable();
    }, PUBLIC_TABLE_POLL_MS);
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
    onCleanup(() => {
      clearInterval(poll);
      clearInterval(tick);
    });
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
            <button
              type="button"
              class={styles.friendsChip}
              aria-label={formatMessage('home.playWithFriends')}
              onClick={() => nav.navigate('play')}
            >
              <span class={styles.supportLabel} dir="auto">
                {formatMessage('home.playWithFriends')}
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
          </div>
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
          <button
            type="button"
            class={styles.cta}
            aria-label={formatMessage('home.findGame')}
            disabled={joining()}
            onClick={() => void enterMatch()}
          >
            <span class={styles.ctaLabel} dir="auto">
              {formatMessage(joining() ? 'joinGame.joining' : 'home.findGame')}
            </span>
            <span class={styles.ctaCount} aria-hidden="true">
              {formatMessage('joinGame.playerCountShort', {
                count: seatedCount(),
                max: maxSeats(),
              })}
            </span>
          </button>
        </div>
      </div>
    </Screen>
  );
}
