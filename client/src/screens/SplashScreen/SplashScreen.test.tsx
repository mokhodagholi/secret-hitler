import { describe, expect, it } from '@rstest/core';
import { screen } from '@solidjs/testing-library';
import { SplashScreen } from './SplashScreen';
import { buildHarness, renderWithApp } from '../../../test/test-utils';
import { en } from '../../i18n/locales/en';

describe('SplashScreen', () => {
  it('Should paint a quote and a numbered progress bar', () => {
    const harness = buildHarness();
    renderWithApp(() => <SplashScreen />, harness);

    expect(screen.queryByRole('heading', { name: en.home.title })).toBeNull();
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
    expect(document.querySelector('blockquote')).toBeTruthy();
    expect(document.querySelector('blockquote')?.textContent?.length).toBeGreaterThan(10);
  });

  it('Should tell the player they have no internet after the probe fails', () => {
    const harness = buildHarness();
    renderWithApp(() => <SplashScreen offline />, harness);

    expect(screen.getByText(en.splash.offline)).toBeTruthy();
    expect(screen.getByRole('button', { name: en.splash.offlineRetry })).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
