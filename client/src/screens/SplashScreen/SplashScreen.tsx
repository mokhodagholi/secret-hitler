import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import { useApp } from '../../services/AppContext';
import splashArt from '../../assets/splash/hitler-splash.webp';
import { SPLASH_QUOTES } from './quotes';
import {
  advanceSplashPercent,
  splashPercentFromBytes,
} from './progress';
import styles from './SplashScreen.module.scss';

const QUOTE_ROTATE_MS = 7_000;
const SNAP_PERCENT = process.env.NODE_ENV === 'test';

export interface SplashScreenProps {
  /** After five seconds of failed probes — stay on the lectern. */
  offline?: boolean;
  onRetry?: () => void;
}

/**
 * First-open gate: the lectern painting, a quote, and a numbered gold bar
 * while the home stage (hero, desk, boards, menu bed) lands in cache.
 */
export function SplashScreen(props: SplashScreenProps) {
  const { i18n, prefetch } = useApp();
  const { formatMessage } = i18n;
  const [quoteIndex, setQuoteIndex] = createSignal(
    Math.floor(Math.random() * SPLASH_QUOTES.length),
  );
  const [shown, setShown] = createSignal(0);

  const actualPercent = () => {
    const { loaded, total } = prefetch.progress();
    return splashPercentFromBytes(loaded, total);
  };

  onMount(() => {
    const quoteTimer = window.setInterval(() => {
      if (props.offline) return;
      setQuoteIndex((i) => (i + 1) % SPLASH_QUOTES.length);
    }, QUOTE_ROTATE_MS);

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const deltaMs = now - last;
      last = now;
      if (!props.offline) {
        setShown((current) => advanceSplashPercent(current, actualPercent(), deltaMs));
      }
      frame = requestAnimationFrame(tick);
    };
    if (!SNAP_PERCENT) frame = requestAnimationFrame(tick);

    onCleanup(() => {
      clearInterval(quoteTimer);
      cancelAnimationFrame(frame);
    });
  });

  const quote = () => SPLASH_QUOTES[quoteIndex()];
  const lang = () => i18n.lang();
  const quoteText = () => quote().text[lang()];
  const quoteBy = () => quote().by?.[lang()];

  const percent = () => {
    const value = SNAP_PERCENT ? actualPercent() : shown();
    return Math.min(100, Math.round(value));
  };
  const percentLabel = () => formatMessage('splash.progress', { percent: percent() });

  return (
    <div class={styles.splash} role="status" aria-busy={!props.offline}>
      <div class={styles.canvas}>
        <img class={styles.art} src={splashArt} alt="" />
        <blockquote class={styles.quote}>
          <Show
            when={!props.offline}
            fallback={
              <>
                <p class={styles.quoteText}>{formatMessage('splash.offline')}</p>
                <button type="button" class={styles.retry} onClick={() => props.onRetry?.()}>
                  {formatMessage('splash.offlineRetry')}
                </button>
              </>
            }
          >
            <p class={styles.quoteText}>{quoteText()}</p>
            <Show when={quoteBy()}>
              <cite class={styles.quoteBy}>{quoteBy()}</cite>
            </Show>
          </Show>
        </blockquote>
        <Show when={!props.offline}>
          <div
            class={styles.bar}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent()}
            aria-valuetext={percentLabel()}
            style={{ '--progress': String(percent()) }}
          >
            <span class={styles.percent} aria-hidden="true">
              {percentLabel()}
            </span>
            <span class={styles.fill} aria-hidden="true">
              <span class={styles.percentOnFill}>{percentLabel()}</span>
            </span>
          </div>
        </Show>
      </div>
    </div>
  );
}
