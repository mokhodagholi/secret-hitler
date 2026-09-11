import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { screen } from '@solidjs/testing-library';
import { SplashScreen } from './SplashScreen';
import { buildHarness, renderWithApp } from '../../../test/test-utils';
import { en } from '../../i18n/locales/en';

afterEach(() => {
  rs.restoreAllMocks();
});

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error('timed out waiting');
}

describe('SplashScreen', () => {
  it('Should paint a quote and a progress bar at 0%', () => {
    const harness = buildHarness();
    renderWithApp(() => <SplashScreen />, harness);

    expect(screen.queryByRole('heading', { name: en.home.title })).toBeNull();
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeTruthy();
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
    expect(bar.getAttribute('aria-valuetext')).toBe('0%');
    expect(document.querySelector('blockquote')).toBeTruthy();
    expect(document.querySelector('blockquote')?.textContent?.length).toBeGreaterThan(10);
  });

  it('Should fill the bar from downloaded bytes, not from finished files', async () => {
    const pendingReads: Array<(result: { done: boolean; value?: Uint8Array }) => void> = [];
    rs.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      if (String(input) !== '/theme.mp3') {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      return Promise.resolve({
        ok: true,
        headers: { get: (header: string) => (header === 'content-length' ? '8' : null) },
        body: {
          getReader: () => ({
            read: () =>
              new Promise<{ done: boolean; value?: Uint8Array }>((resolve) => {
                pendingReads.push(resolve);
              }),
          }),
        },
      } as unknown as Response);
    });

    const harness = buildHarness();
    renderWithApp(() => <SplashScreen />, harness);
    const boot = harness.services.prefetch.boot(['/theme.mp3']);
    await waitUntil(() => pendingReads.length > 0);
    pendingReads.shift()?.({ done: false, value: new Uint8Array(4) });
    await waitUntil(() => screen.getByRole('progressbar').getAttribute('aria-valuenow') === '50');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('50%');

    await waitUntil(() => pendingReads.length > 0);
    pendingReads.shift()?.({ done: false, value: new Uint8Array(4) });
    await waitUntil(() => pendingReads.length > 0);
    pendingReads.shift()?.({ done: true });
    await boot;
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('Should tell the player they have no internet after the probe fails', () => {
    const harness = buildHarness();
    renderWithApp(() => <SplashScreen offline />, harness);

    expect(screen.getByText(en.splash.offline)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.splash.offlineRetry })).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
