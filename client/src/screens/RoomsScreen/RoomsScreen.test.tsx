import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import type { CreateRoomRequest } from '@secret-hitler/shared';
import { RoomsScreen } from './RoomsScreen';
import { BaleService } from '../../services/BaleService';
import { RoomApiError } from '../../services/GameStateService';
import { en } from '../../i18n/locales/en';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

class NativeBackBale extends BaleService {
  usesNativeBack(): boolean {
    return true;
  }
}

describe('RoomsScreen', () => {
  it('Should keep create-room fields from inviting browser suggest', () => {
    const harness = buildHarness();
    renderWithApp(() => <RoomsScreen initialTab="create" />, harness);

    const name = screen.getByLabelText(en.createRoom.roomName);
    expect(name.getAttribute('autocomplete')).toBe('off');
    expect(name.getAttribute('enterkeyhint')).toBe('go');

    const password = screen.getByLabelText(en.createRoom.password);
    expect(password.getAttribute('autocomplete')).toBe('new-password');
    expect(password.getAttribute('spellcheck')).toBe('false');
  });

  it('Should put the back action in the page header', () => {
    const harness = buildHarness();
    harness.services.nav.navigate('play');
    renderWithApp(() => <RoomsScreen />, harness);

    expect(screen.getByRole('heading', { name: en.play.title })).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.common.back })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(harness.services.nav.screen()).toBe('home');
  });

  it('Should hide the in-app back arrow when Bale owns the back chrome', () => {
    const harness = buildHarness();
    harness.services.bale = new NativeBackBale();
    renderWithApp(() => <RoomsScreen />, harness);

    expect(screen.getByRole('heading', { name: en.play.title })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
    expect(screen.queryByRole('button', { name: en.common.back })).toBeNull();
  });

  it('Should create a room without asking how many will sit', async () => {
    const harness = buildHarness();
    harness.services.settings.set('profileName', 'Ana');
    const requests: CreateRoomRequest[] = [];
    harness.services.game.createRoom = async (request) => {
      requests.push(request);
      throw new RoomApiError('NETWORK', 'stop');
    };
    renderWithApp(() => <RoomsScreen initialTab="create" />, harness);

    expect(screen.queryByRole('button', { name: '+' })).toBeNull();
    expect(screen.queryByRole('button', { name: '−' })).toBeNull();

    fireEvent.input(screen.getByLabelText(en.createRoom.roomName), {
      target: { value: 'Friday Night' },
    });
    fireEvent.click(screen.getByRole('button', { name: en.createRoom.submit }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].options?.maxPlayers).toBeUndefined();
  });
});
