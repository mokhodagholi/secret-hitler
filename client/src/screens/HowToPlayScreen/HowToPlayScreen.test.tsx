import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { HowToPlayScreen } from './HowToPlayScreen';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('HowToPlayScreen', () => {
  it('Should open on the first step with the page counter at 1/4', () => {
    renderWithApp(() => <HowToPlayScreen />, buildHarness());

    expect(screen.getByText('Deal Roles')).toBeTruthy();
    expect(screen.getByText('1/4')).toBeTruthy();
  });

  it('Should advance to the next step when the Next arrow is pressed', () => {
    renderWithApp(() => <HowToPlayScreen />, buildHarness());

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Elect a Government')).toBeTruthy();
    expect(screen.getByText('2/4')).toBeTruthy();
  });

  it('Should jump straight to a step when its dot is tapped', () => {
    renderWithApp(() => <HowToPlayScreen />, buildHarness());

    fireEvent.click(screen.getByRole('tab', { name: '4' }));
    expect(screen.getByText('Achieve Your Agenda')).toBeTruthy();
    expect(screen.getByText('4/4')).toBeTruthy();
  });
});
