import {
  For,
  Index,
  Match,
  Show,
  Switch,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Screen } from '../../components/Screen/Screen';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import { INTRO_SLIDES, effectForIntroVisual } from '../../tutorial/introSlides';
import { tutorialYou } from '../../tutorial/cast';
import { faNum } from '../../i18n/utils';
import { CARD_BACK } from '../../assets/cards';
import policyLiberal from '../../assets/table/policy/liberal.webp';
import policyFascist from '../../assets/table/policy/fascist.webp';
import styles from './OnboardingIntroScreen.module.scss';

/** Pause on the reassure beat before the pieces start over. */
export const INTRO_REASSURE_MS = 3000;

/**
 * Step 0 — name the pieces. Last page asks if they got it, then opens look.
 * Yes → look table. No → reassure, then restart from the first piece.
 */
export function OnboardingIntroScreen() {
  const { tutorial, nav, i18n, animation, settings, sound, ravi, game, miniApp } = useApp();
  const { formatMessage } = i18n;
  const [reassuring, setReassuring] = createSignal(false);
  let reassureTimer: ReturnType<typeof setTimeout> | undefined;

  const slide = createMemo(() => INTRO_SLIDES[tutorial.introBeat()] ?? INTRO_SLIDES[0]);

  createEffect(() => {
    if (!tutorial.introducing()) return;
    const effect = effectForIntroVisual(slide().visual);
    if (effect) sound.play(effect);
  });

  // A beat can notify twice (reassure ending, then the restart). Same sentence stays quiet.
  let spokenGuide: string | undefined;
  createEffect(() => {
    if (!tutorial.introducing()) {
      spokenGuide = undefined;
      return;
    }
    const key = reassuring() ? 'onboard.piece.checkReassure' : slide().bodyKey;
    if (key === spokenGuide) return;
    spokenGuide = key;
    void ravi.speakGuide(key);
  });
  const atStart = () => tutorial.introBeat() === 0;
  const onCheck = () => slide().visual.kind === 'check';
  /** Bottom actions wait until this page's line has finished. */
  const actionsReady = () => !ravi.speaking();
  /** Separate bdi nodes — a single "۱ از ۱۰" string merges the digits under RTL bidi. Follow page dir (no forced ltr) so fa keeps current on the right. */
  const progressCurrent = () => {
    const n = tutorial.introBeat() + 1;
    return i18n.lang() === 'fa' ? faNum(n) : String(n);
  };
  const progressTotal = () => {
    const n = INTRO_SLIDES.length;
    return i18n.lang() === 'fa' ? faNum(n) : String(n);
  };
  const progressSep = () => (i18n.lang() === 'fa' ? ' از ' : ' / ');

  function identity() {
    return {
      initData: miniApp.initData(),
      clientId: settings.settings.profileId,
    };
  }

  onCleanup(() => {
    if (reassureTimer !== undefined) clearTimeout(reassureTimer);
  });

  onMount(() => {
    const handleBack = () => {
      if (reassuring()) return;
      ravi.prime();
      if (!tutorial.retreatIntro()) leave();
    };
    nav.setBackHandler(handleBack);
    onCleanup(() => nav.clearBackHandler(handleBack));
  });

  function leave(): void {
    if (reassureTimer !== undefined) clearTimeout(reassureTimer);
    setReassuring(false);
    void game.recordOnboard('skip', {
      ...identity(),
      stage: 'intro',
      beat: tutorial.introBeat(),
    });
    tutorial.skipIntro();
    nav.returnTo('home');
  }

  function openLook(): void {
    tutorial.advanceIntro();
    tutorial.startLook(
      tutorialYou(
        settings.settings.profileName.trim() || formatMessage('game.you'),
        settings.settings.avatar,
        formatMessage,
      ),
    );
    nav.navigate('game');
  }

  function next(): void {
    ravi.prime();
    void game.recordOnboard('continue', {
      ...identity(),
      stage: 'intro',
      beat: tutorial.introBeat(),
    });
    if (!tutorial.advanceIntro()) return;
    // Last slide is check — stay; do not open look until they answer.
  }

  function notYet(): void {
    if (reassuring()) return;
    ravi.prime();
    void game.recordOnboard('not_yet', { ...identity(), stage: 'intro' });
    setReassuring(true);
    reassureTimer = setTimeout(() => {
      reassureTimer = undefined;
      // One update — otherwise the check line speaks again before beat 0.
      batch(() => {
        setReassuring(false);
        tutorial.restartIntro();
      });
    }, INTRO_REASSURE_MS);
  }

  const title = () =>
    reassuring()
      ? formatMessage('onboard.piece.checkReassure')
      : formatMessage(slide().titleKey);

  const body = () => (reassuring() ? '' : formatMessage(slide().bodyKey));

  return (
    <Screen fill>
      <div
        classList={{
          [styles.page]: true,
        }}
        ref={(element) => void animation.play(element, 'screen-enter')}
      >
        <header class={styles.top}>
          <span class={styles.progress}>
            <bdi>{progressCurrent()}</bdi>
            {progressSep()}
            <bdi>{progressTotal()}</bdi>
          </span>
        </header>

        <div class={styles.stage}>
          <Switch>
            <Match when={slide().visual.kind === 'government'}>
              <div class={styles.government} aria-hidden="true" dir="ltr">
                <span class={styles.badgePresident}>
                  {formatMessage('game.president')}
                </span>
                <span class={styles.badgeArrow}>→</span>
                <span class={styles.badgeChancellor}>
                  {formatMessage('game.chancellor')}
                </span>
              </div>
            </Match>
            <Match when={slide().visual.kind === 'tracker'}>
              <IntroTracker
                marks={
                  slide().visual.kind === 'tracker' ? slide().visual.marks : 1
                }
                label={formatMessage('game.electionTracker')}
              />
            </Match>
            <Match when={slide().visual.kind === 'deck' ? slide().visual : false}>
              {(visual) => (
                <IntroDeck
                  draw={visual().kind === 'deck' ? visual().draw : 4}
                  discard={visual().kind === 'deck' ? visual().discard : 2}
                  drawLabel={formatMessage('onboard.piece.deckDraw')}
                  discardLabel={formatMessage('onboard.piece.deckDiscard')}
                />
              )}
            </Match>
            <Match when={slide().visual.kind === 'laws'}>
              <div class={styles.laws} aria-hidden="true">
                <WarmImg class={styles.lawCard} src={policyLiberal} alt="" />
                <WarmImg class={styles.lawCard} src={policyFascist} alt="" />
              </div>
            </Match>
            <Match when={slide().visual.kind === 'check'}>
              <div class={styles.checkMark} aria-hidden="true">
                ?
              </div>
            </Match>
            <Match when={slide().visual.kind === 'images'}>
              <div
                classList={{
                  [styles.images]: true,
                  [styles.imagesRow]:
                    slide().visual.kind === 'images' &&
                    slide().visual.layout === 'row',
                  [styles.imagesStack]:
                    slide().visual.kind === 'images' &&
                    slide().visual.layout === 'stack',
                  [styles.imagesTrio]:
                    slide().visual.kind === 'images' &&
                    slide().visual.layout === 'trio',
                }}
              >
                <For
                  each={
                    slide().visual.kind === 'images' ? slide().visual.srcs : []
                  }
                >
                  {(src) => <WarmImg class={styles.art} src={src} alt="" />}
                </For>
              </div>
            </Match>
          </Switch>
        </div>

        <div class={styles.copy}>
          <h1 class={styles.title} dir="auto">
            {title()}
          </h1>
          <Show when={body()}>
            <p class={styles.body} dir="auto">
              {body()}
            </p>
          </Show>
        </div>

        <div class={styles.chrome}>
          <div class={styles.nav}>
            <Show when={onCheck() && !reassuring() && actionsReady()}>
              <button
                type="button"
                class={styles.continue}
                onClick={() => {
                  void game.recordOnboard('got_it', { ...identity(), stage: 'intro' });
                  openLook();
                }}
              >
                {formatMessage('onboard.piece.checkYes')}
              </button>
            </Show>
            <Show when={!onCheck() && actionsReady()}>
              <button type="button" class={styles.continue} onClick={next}>
                {formatMessage('onboard.continue')}
              </button>
            </Show>
            <Show when={!atStart() && !reassuring() && actionsReady()}>
              <button
                type="button"
                class={styles.previous}
                onClick={() => {
                  ravi.prime();
                  tutorial.retreatIntro();
                }}
              >
                {formatMessage('onboard.previous')}
              </button>
            </Show>
            <Show when={onCheck() && !reassuring() && actionsReady()}>
              <button type="button" class={styles.secondary} onClick={notYet}>
                {formatMessage('onboard.piece.checkNo')}
              </button>
            </Show>
          </div>
          <button
            type="button"
            classList={{ [styles.skip]: true, [styles.skipHeld]: !actionsReady() }}
            onClick={() => {
              if (!actionsReady()) return;
              void game.recordOnboard('skip', {
                ...identity(),
                stage: 'intro',
                beat: tutorial.introBeat(),
              });
              openLook();
            }}
          >
            {formatMessage('onboard.skip')}
          </button>
        </div>
      </div>
    </Screen>
  );
}

/** Draw pile (left) and discard (right) as short stacks. */
function IntroDeck(props: {
  draw: number;
  discard: number;
  drawLabel: string;
  discardLabel: string;
}) {
  return (
    <div class={styles.deckRow} dir="ltr" aria-hidden="true">
      <div class={styles.deckPile}>
        <span class={styles.deckLabel}>{props.drawLabel}</span>
        <CardStack count={props.draw} />
      </div>
      <div class={styles.deckPile}>
        <span class={styles.deckLabel}>{props.discardLabel}</span>
        <CardStack count={props.discard} burned />
      </div>
    </div>
  );
}

function CardStack(props: { count: number; burned?: boolean }) {
  const slots = () => Array.from({ length: props.count }, (_, index) => index);
  return (
    <div
      classList={{
        [styles.cardStack]: true,
        [styles.cardStackBurned]: props.burned === true,
      }}
    >
      <Index each={slots()}>
        {(slot) => (
          <span
            class={styles.stackCard}
            style={{ '--stack-i': String(slot()) }}
          >
            <WarmImg class={styles.stackArt} src={CARD_BACK} alt="" />
          </span>
        )}
      </Index>
    </div>
  );
}

/** Fills marks one-by-one with the same pulse used on the live table. */
function IntroTracker(props: { marks: 0 | 1 | 2 | 3; label: string }) {
  const { animation, sound } = useApp();
  const [shown, setShown] = createSignal(0);
  let markEls: Array<HTMLElement | undefined> = [];
  let run = 0;

  createEffect(() => {
    const target = props.marks;
    const id = ++run;
    const already = shown();
    if (already > target) {
      setShown(target);
      return;
    }
    void (async () => {
      if (already === 0) await animation.hold(280);
      let current = shown();
      while (current < target && id === run) {
        setShown(current + 1);
        const element = markEls[current];
        if (element) void animation.play(element, 'tracker-fill');
        sound.play(current + 1 === 3 ? 'onboard-chaos' : 'onboard-tracker');
        await animation.hold(420);
        current += 1;
      }
    })();
  });

  return (
    <div class={styles.tracker} aria-hidden="true">
      <span class={styles.trackerLabel}>{props.label}</span>
      <span class={styles.marks}>
        <Index each={[0, 1, 2]}>
          {(slot) => (
            <span
              classList={{
                [styles.mark]: true,
                [styles.markFilled]: shown() > slot(),
              }}
              ref={(element) => {
                markEls[slot()] = element;
              }}
            />
          )}
        </Index>
      </span>
    </div>
  );
}
