import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { HowToPlayScreen } from './HowToPlayScreen';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('HowToPlayScreen', () => {
  it('Should open on the first step with the page counter at 1/7', () => {
    renderWithApp(() => <HowToPlayScreen />, buildHarness());

    expect(screen.getByText('Roles & Secrets')).toBeTruthy();
    expect(screen.getByText('1/7')).toBeTruthy();
  });

  it('Should jump straight to a step when its dot is tapped', () => {
    renderWithApp(() => <HowToPlayScreen />, buildHarness());

    fireEvent.click(screen.getByRole('tab', { name: '2' }));
    expect(screen.getByText('Elect a Government')).toBeTruthy();
    expect(screen.getByText('2/7')).toBeTruthy();
  });

  it('Should reach the final tips step from its dot', () => {
    renderWithApp(() => <HowToPlayScreen />, buildHarness());

    fireEvent.click(screen.getByRole('tab', { name: '7' }));
    expect(screen.getByText('Tips & Strategy')).toBeTruthy();
    expect(screen.getByText('7/7')).toBeTruthy();
  });
});
