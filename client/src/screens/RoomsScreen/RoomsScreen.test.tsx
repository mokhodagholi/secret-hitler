import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { Show } from 'solid-js';
import { Phase, type CreateRoomRequest, type RoomSummary } from '@secret-hitler/shared';
import { RoomsScreen } from './RoomsScreen';
import { WaitingRoomScreen } from '../WaitingRoomScreen/WaitingRoomScreen';
import { BaleService } from '../../services/BaleService';
import { RoomApiError } from '../../services/GameStateService';
import { en } from '../../i18n/locales/en';
import { buildHarness, makeView, renderWithApp } from '../../../test/test-utils';

class NativeBackBale extends BaleService {
  usesNativeBack(): boolean {
    return true;
  }
}

describe('RoomsScreen', () => {
  afterEach(() => {
    rs.restoreAllMocks();
  });
  it('Should keep create-room fields from inviting browser suggest', () => {
    const harness = buildHarness({ flags: { roomPassword: true } });
    renderWithApp(() => <RoomsScreen initialTab="create" />, harness);

    const name = screen.getByLabelText(en.createRoom.roomName);
    expect(name.getAttribute('autocomplete')).toBe('off');
    expect(name.getAttribute('enterkeyhint')).toBe('go');
    expect(name.closest('[data-keyboard-form]')).toBeTruthy();

    const password = screen.getByLabelText(en.createRoom.password);
    expect(password.getAttribute('autocomplete')).toBe('new-password');
    expect(password.getAttribute('spellcheck')).toBe('false');
  });

  it('Should hide the create password field when roomPassword is off', () => {
    const harness = buildHarness();
    renderWithApp(() => <RoomsScreen initialTab="create" />, harness);

    expect(screen.getByLabelText(en.createRoom.roomName)).toBeTruthy();
    expect(screen.queryByLabelText(en.createRoom.password)).toBeNull();
  });

  it('Should open Join before Create when no tab is asked for', () => {
    const harness = buildHarness();
    renderWithApp(() => <RoomsScreen />, harness);

    expect(screen.getByRole('tab', { name: en.rooms.joinTab }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: en.rooms.createTab }).getAttribute('aria-selected')).toBe(
      'false',
    );
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
    harness.services.miniApp = new NativeBackBale();
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

  it('Should join a share-link room by code without opening the rooms list', async () => {
    const harness = buildHarness({ initialPath: '/join/L2YYP4' });
    harness.services.settings.set('profileName', 'Ana');
    const joined: string[] = [];
    harness.services.game.listRooms = async () => {
      throw new Error('share links must not list rooms');
    };
    harness.services.game.joinRoom = async (idOrCode) => {
      joined.push(idOrCode);
      return {
        roomId: 'room-1',
        code: idOrCode,
        token: 'token-1',
        playerId: 'you',
      };
    };
    renderWithApp(() => <RoomsScreen initialTab="join" />, harness);

    await waitFor(() => expect(joined).toEqual(['L2YYP4']));
    expect(screen.queryByText(en.joinGame.noRooms)).toBeNull();
    expect(screen.queryByText(en.joinGame.colName)).toBeNull();
    expect(harness.services.nav.screen()).toBe('waiting-room');
  });

  it('Should ask for a name before joining a share-link room', async () => {
    const harness = buildHarness({ initialPath: '/join/ABC123' });
    const joined: string[] = [];
    harness.services.game.joinRoom = async (idOrCode) => {
      joined.push(idOrCode);
      return {
        roomId: 'room-1',
        code: idOrCode,
        token: 'token-1',
        playerId: 'you',
      };
    };
    renderWithApp(() => <RoomsScreen initialTab="join" />, harness);

    expect(joined).toEqual([]);
    expect(screen.queryByText(en.joinGame.colName)).toBeNull();
    fireEvent.input(screen.getByLabelText(en.joinGame.yourName), {
      target: { value: 'Ben' },
    });
    fireEvent.click(screen.getByRole('button', { name: en.joinGame.submit }));
    await waitFor(() => expect(joined).toEqual(['ABC123']));
    expect(harness.services.nav.screen()).toBe('waiting-room');
  });

  it('Should ask for a password when a share-link room is locked', async () => {
    const harness = buildHarness({
      initialPath: '/join/ABC123',
      flags: { roomPassword: true },
    });
    harness.services.settings.set('profileName', 'Ana');
    let attempts = 0;
    harness.services.game.joinRoom = async (_idOrCode, request) => {
      attempts += 1;
      if (!request.password) {
        throw new RoomApiError('WRONG_PASSWORD', 'Wrong password');
      }
      return {
        roomId: 'room-1',
        code: 'ABC123',
        token: 'token-1',
        playerId: 'you',
      };
    };
    renderWithApp(() => <RoomsScreen initialTab="join" />, harness);

    await waitFor(() => expect(attempts).toBe(1));
    expect(screen.queryByText(en.joinGame.colName)).toBeNull();
    fireEvent.input(screen.getByLabelText(en.joinGame.password), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: en.joinGame.submit }));
    await waitFor(() => expect(attempts).toBe(2));
    expect(harness.services.nav.screen()).toBe('waiting-room');
  });

  it('Should try a listed locked room without a password before asking', async () => {
    const harness = buildHarness();
    harness.services.settings.set('profileName', 'Ana');
    const attempts: Array<string | undefined> = [];
    harness.services.game.listRooms = async () => [
      {
        id: 'room-1',
        code: 'ABC123',
        name: 'Friday',
        playerCount: 2,
        maxPlayers: 10,
        hasPassword: true,
        phase: Phase.Lobby,
      },
    ];
    harness.services.game.joinRoom = async (_idOrCode, request) => {
      attempts.push(request.password);
      if (!request.password) {
        throw new RoomApiError('WRONG_PASSWORD', 'Wrong password');
      }
      return {
        roomId: 'room-1',
        code: 'ABC123',
        token: 'token-1',
        playerId: 'you',
      };
    };
    renderWithApp(() => <RoomsScreen initialTab="join" />, harness);

    await waitFor(() => expect(screen.getByText('Friday')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: en.joinGame.join }));
    await waitFor(() => expect(attempts).toEqual([undefined]));
    fireEvent.input(screen.getByLabelText(en.joinGame.password), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: en.joinGame.submit }));
    await waitFor(() => expect(attempts).toEqual([undefined, 'secret']));
    expect(harness.services.nav.screen()).toBe('waiting-room');
  });

  it('Should stay on create/join when the player already holds a live seat', () => {
    const harness = buildHarness({ seated: true });
    harness.services.nav.navigate('play');
    renderWithApp(() => <RoomsScreen initialTab="create" />, harness);
    harness.pushState(makeView());

    expect(harness.services.nav.screen()).toBe('play');
    expect(screen.getByRole('tab', { name: en.rooms.createTab })).toBeTruthy();
    expect(screen.getByRole('tab', { name: en.rooms.joinTab })).toBeTruthy();
  });

  it('Should pin the public table first on Join', async () => {
    const harness = buildHarness();
    harness.services.game.listRooms = async () => [
      {
        id: 'hosted',
        code: 'ABC123',
        name: 'Friday',
        playerCount: 2,
        maxPlayers: 10,
        hasPassword: false,
        phase: Phase.Lobby,
      },
      {
        id: 'public',
        code: 'PUB001',
        name: 'Untitled',
        playerCount: 0,
        maxPlayers: 10,
        hasPassword: false,
        phase: Phase.Lobby,
        kind: 'public',
      },
    ];
    renderWithApp(() => <RoomsScreen initialTab="join" />, harness);
    await waitFor(() => expect(screen.getByText(en.rooms.publicName)).toBeTruthy());
    const names = screen.getAllByText(/Public table|Friday/).map((node) => node.textContent);
    expect(names[0]).toContain(en.rooms.publicName);
  });

  it('Should seat Find Game in the chosen lobby, not the previous table', async () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('profileName', 'Ana');
    const openLobby: RoomSummary = {
      id: 'room-2',
      code: 'XYZ789',
      name: 'New Table',
      playerCount: 2,
      maxPlayers: 10,
      hasPassword: false,
      phase: Phase.Lobby,
    };
    harness.services.game.listRooms = async () => [openLobby];
    rs.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          roomId: 'room-2',
          code: 'XYZ789',
          token: 'token-2',
          playerId: 'you-2',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    harness.services.nav.navigate('play');
    renderWithApp(
      () => (
        <Show
          when={harness.services.nav.screen() === 'play'}
          fallback={<WaitingRoomScreen />}
        >
          <RoomsScreen initialTab="join" />
        </Show>
      ),
      harness,
    );
    harness.pushState(makeView({ phase: Phase.Nomination }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: en.joinGame.join })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: en.joinGame.join }));
    await waitFor(() => expect(harness.services.nav.screen()).toBe('waiting-room'));
    expect(harness.services.game.view()).toBeNull();
    expect(harness.services.game.currentSession()?.roomId).toBe('room-2');
  });

  it('Should hide Create when the public table is on', () => {
    const harness = buildHarness({ flags: { publicTable: true } });
    harness.services.game.listRooms = async () => [];
    renderWithApp(() => <RoomsScreen />, harness);

    expect(screen.queryByRole('tab', { name: en.rooms.createTab })).toBeNull();
    expect(screen.queryByRole('tab', { name: en.rooms.joinTab })).toBeNull();
    expect(screen.getByRole('button', { name: en.rooms.ownTable })).toBeTruthy();
  });

  it('Should record own-table interest without creating a room', async () => {
    const harness = buildHarness({ flags: { publicTable: true } });
    harness.services.settings.set('profileId', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    harness.services.game.listRooms = async () => [];
    const intents: string[] = [];
    const bodies: unknown[] = [];
    harness.services.game.recordOwnRoom = async (intent, identity) => {
      intents.push(intent);
      bodies.push(identity);
    };
    renderWithApp(() => <RoomsScreen />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.rooms.ownTable }));
    expect(screen.getByText(en.rooms.ownTableBody)).toBeTruthy();
    await waitFor(() => expect(intents).toEqual(['prompt']));
    expect(bodies[0]).toEqual({
      initData: undefined,
      clientId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });

    fireEvent.click(screen.getByRole('button', { name: en.rooms.ownTableWant }));
    await waitFor(() => expect(intents).toEqual(['prompt', 'want']));
    expect(harness.services.nav.screen()).not.toBe('waiting-room');
    expect(screen.queryByText(en.rooms.ownTableBody)).toBeNull();
  });

  it('Should show salon empty copy when the public table is missing', async () => {
    const harness = buildHarness({ flags: { publicTable: true } });
    harness.services.game.listRooms = async () => [];
    renderWithApp(() => <RoomsScreen />, harness);

    await waitFor(() => expect(screen.getByText(en.joinGame.noSalon)).toBeTruthy());
    expect(screen.queryByText(en.joinGame.noRooms)).toBeNull();
  });

  it('Should not offer a manual Join refresh', async () => {
    const harness = buildHarness();
    harness.services.game.listRooms = async () => [];
    renderWithApp(() => <RoomsScreen initialTab="join" />, harness);
    expect(screen.queryByRole('button', { name: /refresh/i })).toBeNull();
  });

  it('Should update Join seats when the live list changes', async () => {
    const harness = buildHarness();
    const openLobby: RoomSummary = {
      id: 'room-1',
      code: 'ABC123',
      name: 'Friday',
      playerCount: 2,
      maxPlayers: 10,
      hasPassword: false,
      phase: Phase.Lobby,
    };
    let push: ((rooms: RoomSummary[]) => void) | undefined;
    harness.services.game.listRooms = async () => [openLobby];
    harness.services.game.watchJoinList = (onList) => {
      push = onList;
      return () => {
        push = undefined;
      };
    };
    renderWithApp(() => <RoomsScreen initialTab="join" />, harness);

    await waitFor(() => expect(screen.getByText('2/10')).toBeTruthy());
    push?.([{ ...openLobby, playerCount: 5 }]);
    await waitFor(() => expect(screen.getByText('5/10')).toBeTruthy());
  });
});
