import { describe, expect, it, rs } from '@rstest/core';
import { AnimationService } from './AnimationService';
import { SettingsService } from './SettingsService';
import { ANIMATIONS } from '../animations/registry';

function buildService(options: { reduceMotion?: boolean } = {}) {
  const settings = new SettingsService();
  settings.set('reduceMotion', options.reduceMotion ?? false);
  return new AnimationService(settings);
}

/** jsdom has no Web Animations API — give one connected element a recording stub. */
function makeAnimatedElement() {
  const element = document.createElement('div');
  document.body.appendChild(element); // play() only animates connected elements
  const animate = rs.fn(() => ({ finished: Promise.resolve() }));
  (element as unknown as { animate: unknown }).animate = animate;
  return { element, animate };
}

describe('AnimationService — play', () => {
  it('Should run the registered keyframes and clean up will-change', async () => {
    const { element, animate } = makeAnimatedElement();

    await buildService().play(element, 'fade-in');

    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledWith(
      ANIMATIONS['fade-in'].keyframes,
      ANIMATIONS['fade-in'].options,
    );
    expect(element.style.willChange).toBe('');
  });

  it('Should merge per-call option overrides over the registry defaults', async () => {
    const { element, animate } = makeAnimatedElement();

    await buildService().play(element, 'fade-in', { duration: 50 });

    expect(animate).toHaveBeenCalledWith(ANIMATIONS['fade-in'].keyframes, {
      ...ANIMATIONS['fade-in'].options,
      duration: 50,
    });
  });

  it('Should skip the animation entirely while Reduce Motion is on', async () => {
    const { element, animate } = makeAnimatedElement();

    await buildService({ reduceMotion: true }).play(element, 'pop-in');

    expect(animate).not.toHaveBeenCalled();
  });

  it('Should resolve quietly without a Web Animations API or element', async () => {
    const plainElement = document.createElement('div'); // jsdom: no .animate
    const service = buildService();

    await expect(service.play(plainElement, 'fade-in')).resolves.toBeUndefined();
    await expect(service.play(null, 'fade-in')).resolves.toBeUndefined();
  });

  it('Should wait a frame for a detached element and animate once connected', async () => {
    const { element, animate } = makeAnimatedElement();
    element.remove(); // refs fire before insertion — simulate that window
    const playing = buildService().play(element, 'fade-in');
    document.body.appendChild(element);

    await playing;
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it('Should leave a never-mounted element untouched', async () => {
    const { element, animate } = makeAnimatedElement();
    element.remove();

    await buildService().play(element, 'fade-in');

    expect(animate).not.toHaveBeenCalled();
  });
});

describe('AnimationService — sequencing', () => {
  it('Should run enqueued beats strictly in arrival order', async () => {
    const service = buildService();
    const order: number[] = [];

    const first = service.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push(1);
    });
    const second = service.enqueue(() => {
      order.push(2);
    });

    await Promise.all([first, second]);
    expect(order).toEqual([1, 2]);
  });

  it('Should keep the queue alive after a failing beat', async () => {
    const service = buildService();
    const order: string[] = [];

    void service.enqueue(() => {
      throw new Error('animation bug');
    });
    await service.enqueue(() => {
      order.push('survivor');
    });

    expect(order).toEqual(['survivor']);
  });

  it('Should skip suspense holds while Reduce Motion is on', async () => {
    const service = buildService({ reduceMotion: true });
    // A skipped hold resolves immediately — were it not skipped, this await
    // would sit the full 10s and trip the test timeout.
    await service.hold(10_000);
  });
});
