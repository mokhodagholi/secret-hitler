import { createEffect, createSignal, onCleanup, untrack } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { deleteDelayMs, typeDelayMs } from './typewriter';

export interface TypewriterTextProps {
  text: string;
}

const INSTANT =
  import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test';

/**
 * Types the Ravi line on, then rubs it out before the next one. Motion-off
 * and tests jump to the finished string so the header never lags the table.
 */
export function TypewriterText(props: TypewriterTextProps) {
  const { animation } = useApp();
  const [shown, setShown] = createSignal('');

  const instant = () => INSTANT || !animation.motionEnabled();

  createEffect(() => {
    const target = props.text;
    if (instant()) {
      setShown(target);
      return;
    }

    let cancelled = false;
    const from = untrack(shown);
    void (async () => {
      if (from === target) return;
      const outgoing = Array.from(from);
      const totalOut = outgoing.length;
      while (outgoing.length > 0 && !cancelled) {
        outgoing.pop();
        setShown(outgoing.join(''));
        await animation.hold(deleteDelayMs(outgoing.length, totalOut));
      }
      if (cancelled) return;
      const incoming = Array.from(target);
      const built: string[] = [];
      for (let index = 0; index < incoming.length; index++) {
        if (cancelled) return;
        built.push(incoming[index]);
        setShown(built.join(''));
        if (index < incoming.length - 1) {
          await animation.hold(typeDelayMs(index, incoming.length));
        }
      }
    })();

    onCleanup(() => {
      cancelled = true;
    });
  });

  return <>{shown()}</>;
}
