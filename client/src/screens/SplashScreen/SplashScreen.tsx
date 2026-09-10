import { Show, createSignal, onCleanup, onMount } from 'solid-js';
import { useApp } from '../../services/AppContext';
import splashArt from '../../assets/splash/hitler-splash.webp';
import { SPLASH_QUOTES } from './quotes';
import styles from './SplashScreen.module.scss';

const QUOTE_ROTATE_MS = 7_000;

export interface SplashScreenProps {
  /** After five seconds of failed probes — stay on the lectern. */
  offline?: boolean;
  onRetry?: () => void;
}

/**
 * First-open gate: the lectern painting, a quote, and a numbered gold bar
 * while the foyer set (SFX + menu bed) lands in cache.
 */
export function SplashScreen(props: SplashScreenProps) {
  const { i18n, prefetch } = useApp();
  const { formatMessage } = i18n;
  const [quoteIndex, setQuoteIndex] = createSignal(
    Math.floor(Math.random() * SPLASH_QUOTES.length),
  );

  onMount(() => {
    const id = window.setInterval(() => {
      if (props.offline) return;
      setQuoteIndex((i) => (i + 1) % SPLASH_QUOTES.length);
    }, QUOTE_ROTATE_MS);
    onCleanup(() => clearInterval(id));
  });

  const quote = () => SPLASH_QUOTES[quoteIndex()];
  const lang = () => i18n.lang();
  const quoteText = () => quote().text[lang()];
  const quoteBy = () => quote().by?.[lang()];

  const percent = () => {
    const { done, total } = prefetch.progress();
    if (total <= 0) return 0;
    return Math.round((done / total) * 100);
  };

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
          >
            <span class={styles.fill} style={{ width: `${percent()}%` }} />
            <span class={styles.percent}>
              {formatMessage('splash.progress', { percent: percent() })}
            </span>
          </div>
        </Show>
      </div>
    </div>
  );
}
