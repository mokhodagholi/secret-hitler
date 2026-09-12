import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { ScreenHeader } from './ScreenHeader';
import { BaleService } from '../../services/BaleService';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

class NativeBackBale extends BaleService {
  usesNativeBack(): boolean {
    return true;
  }
}

describe('ScreenHeader', () => {
  it('Should walk back through navigation from the in-app arrow', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('settings');
    renderWithApp(() => <ScreenHeader title="Settings" />, harness);

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(harness.services.nav.screen()).toBe('home');
  });

  it('Should hide the in-app arrow when native back chrome is in use', () => {
    const harness = buildHarness();
    harness.services.miniApp = new NativeBackBale();
    harness.services.nav.navigate('settings');
    renderWithApp(() => <ScreenHeader title="Settings" />, harness);

    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('Should still intercept the shared back action when the arrow is hidden', () => {
    const harness = buildHarness();
    harness.services.miniApp = new NativeBackBale();
    let intercepted = 0;
    renderWithApp(
      () => <ScreenHeader title="Lobby" onBack={() => (intercepted += 1)} />,
      harness,
    );

    harness.services.nav.requestBack();
    expect(intercepted).toBe(1);
  });
});
