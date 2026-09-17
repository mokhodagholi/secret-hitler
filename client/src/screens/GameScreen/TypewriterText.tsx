import { createEffect, createSignal, onCleanup, untrack } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { typeDelayMs } from './typewriter';

export interface TypewriterTextProps {
  text: string;
  /** Spoken / catalog length for this line — typing finishes with the voice. */
  durationMs?: number;
}

const INSTANT =
  import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test';

const FALLBACK_DURATION_MS = 1_200;

/**
 * Types the Ravi line on. Motion-off and tests jump to the finished string
 * so the header never lags the table. Line changes clear instantly — no
 * rub-out exit — then type the next line paced to {@link durationMs}.
 */
export function TypewriterText(props: TypewriterTextProps) {
  const { animation } = useApp();
  const [shown, setShown] = createSignal('');

  const instant = () => INSTANT || !animation.motionEnabled();

  createEffect(() => {
    const target = props.text;
    const requested = props.durationMs ?? FALLBACK_DURATION_MS;
    if (instant() || requested <= 0) {
      setShown(target);
      return;
    }
    const durationMs = Math.max(400, requested);

    let cancelled = false;
    const from = untrack(shown);
    void (async () => {
      if (from === target) return;
      setShown('');
      const incoming = Array.from(target);
      const built: string[] = [];
      for (let index = 0; index < incoming.length; index++) {
        if (cancelled) return;
        built.push(incoming[index]);
        setShown(built.join(''));
        if (index < incoming.length - 1) {
          await animation.hold(typeDelayMs(index, incoming.length, durationMs));
        }
      }
    })();

    onCleanup(() => {
      cancelled = true;
    });
  });

  return <>{shown()}</>;
}
