import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { Phase, type SocialPerson } from '@secret-hitler/shared';
import { useApp } from '../../services/AppContext';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import type { SocialIdentity } from '../../services/SocialService';
import heroImage from '../../assets/home/hero.webp';
import heroFindingImage from '../../assets/home/hero-finding.webp';
import deskImage from '../../assets/home/desk.png';
import liberalBoard from '../../assets/boards/liberal.png';
import fascistBoard from '../../assets/boards/fascist.png';
import { InviteFriendsSheet } from './InviteFriendsSheet';
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
 * Lobby splash: Hitler at the desk, Find Match on the table, Play with
 * friends under Support. A live seat that can still be claimed gets its
 * own return button above Find Match.
 */
export function HomeScreen() {
  const { nav, game, i18n, prefetch, animation, settings, miniApp, social } = useApp();
  const { formatMessage } = i18n;

  const publicLobby = () => {
    const view = game.view();
    return view?.kind === 'public' && view.phase === Phase.Lobby;
  };
  const finding = () => game.queued() || publicLobby();
  const canRejoin = () => game.inRoom() && game.view() != null && !publicLobby();
  const amWantStart = () => game.you()?.wantsStart ?? false;

  const [nowMs, setNowMs] = createSignal(Date.now());
  const [inviteOpen, setInviteOpen] = createSignal(false);
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

  async function openInvites(): Promise<void> {
    setInviteOpen(true);
    try {
      await social.load(socialIdentity());
    } catch {
      // Empty list + server error toast from fetch; sheet still opens.
    }
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

  async function inviteFriend(friend: SocialPerson): Promise<void> {
    try {
      await social.inviteFriend(friend.accountId, socialIdentity());
      setInviteOpen(false);
      nav.navigate('waiting-room');
    } catch {
      // Stay on the sheet; the list reload or a later tap is enough.
    }
  }

  async function acceptInvite(id: string): Promise<void> {
    try {
      await social.acceptInvite(id, socialIdentity());
      setInviteOpen(false);
      nav.navigate('waiting-room');
    } catch {
      /* Keep the sheet open. */
    }
  }

  async function enterMatch(): Promise<void> {
    if (game.queued()) {
      await game.leaveMatchQueue();
      return;
    }
    if (publicLobby()) {
      if (amWantStart()) return;
      game.leaveRoom();
      return;
    }
    const name = resolvedName() || formatMessage('home.guest');
    try {
      await game.queueMatch({
        name,
        avatar: settings.settings.avatar,
        clientId: settings.settings.profileId,
        initData: miniApp.initData(),
      });
    } catch {
      /* Stay on Home — Join/Create is Play with friends, not Find Match. */
    }
  }

  function rejoinMatch(): void {
    const phase = game.view()?.phase;
    nav.navigate(phase && phase !== Phase.Lobby ? 'game' : 'waiting-room');
  }

  const startChoiceSeconds = () => {
    const choice = game.view()?.startChoice;
    if (!choice) return 0;
    return Math.max(0, Math.ceil((choice.endsAt - nowMs()) / 1000));
  };

  const [supportIndex, setSupportIndex] = createSignal(0);
  const [supportFading, setSupportFading] = createSignal(false);

  createEffect(() => {
    if (!game.view()?.startChoice) return;
    const tick = setInterval(() => setNowMs(Date.now()), 250);
    onCleanup(() => clearInterval(tick));
  });

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
                [styles.heroFinding]: finding(),
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
          <Show when={!finding()}>
            <button
              type="button"
              class={styles.ctaInvite}
              aria-label={formatMessage('home.inviteFriends')}
              onClick={() => void openInvites()}
            >
              <span class={styles.ctaInviteLabel} dir="auto">
                {formatMessage('home.inviteFriends')}
              </span>
            </button>
          </Show>
          <div
            classList={{
              [styles.ctaFind]: true,
              [styles.ctaFinding]: finding(),
            }}
          >
            <button
              type="button"
              classList={{
                [styles.cta]: true,
                [styles.ctaFinding]: finding(),
              }}
              aria-label={formatMessage(finding() ? 'home.finding' : 'home.findGame')}
              onClick={() => void enterMatch()}
            >
              <span
                classList={{
                  [styles.ctaLabel]: true,
                  [styles.ctaLabelFinding]: finding(),
                }}
                dir="auto"
              >
                {formatMessage(finding() ? 'home.finding' : 'home.findGame')}
                <Show when={finding()}>
                  <span class={styles.ctaDots} aria-hidden="true">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </Show>
              </span>
            </button>
          </div>
        </div>
      </div>

      <InviteFriendsSheet
        open={inviteOpen() && !finding()}
        onClose={() => setInviteOpen(false)}
        onInvite={(friend) => void inviteFriend(friend)}
        onAcceptInvite={(id) => void acceptInvite(id)}
        onIgnoreInvite={(id) => void social.ignoreInvite(id, socialIdentity())}
        onAcceptRequest={(id) => void social.acceptFriendRequest(id, socialIdentity())}
        onIgnoreRequest={(id) => void social.ignoreFriendRequest(id, socialIdentity())}
      />
      <MatchHistorySheet
        open={historyOpen()}
        identity={socialIdentity()}
        onClose={() => setHistoryOpen(false)}
      />
      <ConfirmDialog
        open={publicLobby() && game.view()?.startChoice != null && !amWantStart()}
        message={formatMessage('waiting.startChoiceHoldout')}
        confirmLabel={formatMessage('waiting.wantStart')}
        onConfirm={() => game.setWantStart(true)}
      >
        {formatMessage('waiting.startChoiceClock', {
          seconds: startChoiceSeconds(),
        })}
      </ConfirmDialog>
      <ConfirmDialog
        open={publicLobby() && game.view()?.startChoice != null && amWantStart()}
        message={formatMessage('waiting.startChoiceWaiting')}
      >
        {formatMessage('waiting.startChoiceClock', {
          seconds: startChoiceSeconds(),
        })}
      </ConfirmDialog>
    </Screen>
  );
}
