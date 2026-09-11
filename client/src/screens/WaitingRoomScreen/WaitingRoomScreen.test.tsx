import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { Phase } from '@secret-hitler/shared';
import { WaitingRoomScreen } from './WaitingRoomScreen';
import { en } from '../../i18n/locales/en';
import { buildHarness, makePlayer, makeView, renderWithApp } from '../../../test/test-utils';

describe('WaitingRoomScreen', () => {
  it('Should copy a local /join invite on localhost, not a Bale startapp link', async () => {
    const written: string[] = [];
    Object.assign(navigator, {
      clipboard: { writeText: async (text: string) => written.push(text) },
    });
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(makeView({ hostId: 'you', code: 'ABC123' }));

    fireEvent.click(screen.getByRole('button', { name: en.waiting.shareLink }));
    await waitFor(() => {
      expect(written).toEqual([`${location.origin}/join/ABC123`]);
    });
    expect(written[0]).not.toContain('ble.ir');
  });

  it('Should let a guest mark themselves ready', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'host',
        you: { id: 'you', role: null, vote: null, policies: [], peek: [], investigation: null },
        players: [
          makePlayer({ id: 'host', name: 'Ana', seat: 0, isHost: true, ready: true }),
          makePlayer({ id: 'you', name: 'You', seat: 1, ready: false }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: "I'm Ready" }));
    expect(harness.socket.lastSent('player:ready')).toEqual({ type: 'player:ready' });
  });

  it('Should let a ready guest stand down again', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'host',
        you: { id: 'you', role: null, vote: null, policies: [], peek: [], investigation: null },
        players: [
          makePlayer({ id: 'host', name: 'Ana', seat: 0, isHost: true, ready: true }),
          makePlayer({ id: 'you', name: 'You', seat: 1, ready: true }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Not Ready Yet' }));
    expect(harness.socket.lastSent('player:unready')).toEqual({
      type: 'player:unready',
    });
  });

  it('Should tell the host why the game cannot start yet', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        minPlayers: 3,
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true, ready: true }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 1, ready: true }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    expect(
      screen.getByText(/Only 2 players are in the room. Invite 1 more to start/i),
    ).toBeTruthy();
    expect(harness.socket.lastSent('game:start')).toBeUndefined();
  });

  it('Should tell the host when a player is not ready', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true, ready: true }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 1, ready: false }),
          makePlayer({ id: 'cal', name: 'Cal', seat: 2, ready: true }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    expect(
      screen.getByText(/These players are not ready yet/i),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kick Ben' })).toBeTruthy();
    expect(harness.socket.lastSent('game:start')).toBeUndefined();
  });

  it('Should let the host kick an unready player from the start prompt', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true, ready: true }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 1, ready: false }),
          makePlayer({ id: 'cal', name: 'Cal', seat: 2, ready: true }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kick Ben' }));
    expect(screen.getByText(/Kick Ben from the room/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Kick' }));
    expect(harness.socket.lastSent('player:kick')).toEqual({
      type: 'player:kick',
      playerId: 'ben',
    });
  });

  it('Should ask the host to confirm before starting', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true, ready: true }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 1, ready: true }),
          makePlayer({ id: 'cal', name: 'Cal', seat: 2, ready: true }),
        ],
      }),
    );

    const start = screen.getByRole('button', { name: 'Start Game' }) as HTMLButtonElement;
    expect(start.disabled).toBe(false);
    fireEvent.click(start);
    expect(harness.socket.lastSent('game:start')).toBeUndefined();
    expect(screen.getByText(/Start the game with 3 players/i)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Start Game' })[1]);
    expect(harness.socket.lastSent('game:start')).toEqual({ type: 'game:start' });
  });

  it('Should let the host start at the official minimum before the table is full', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        minPlayers: 5,
        maxPlayers: 10,
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true, ready: true }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 1, ready: true }),
          makePlayer({ id: 'cal', name: 'Cal', seat: 2, ready: true }),
          makePlayer({ id: 'dia', name: 'Dia', seat: 3, ready: true }),
          makePlayer({ id: 'eli', name: 'Eli', seat: 4, ready: true }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start Game' }));
    expect(harness.socket.lastSent('game:start')).toBeUndefined();
    expect(screen.getByText(/Start the game with 5 players/i)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Start Game' })[1]);
    expect(harness.socket.lastSent('game:start')).toEqual({ type: 'game:start' });
  });

  it('Should ask the host before kicking a guest', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true, ready: true }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 1, ready: false }),
        ],
      }),
    );

    const hostSeat = screen.getByRole('listitem', { name: 'You' });
    expect(hostSeat.tagName).not.toBe('BUTTON');
    fireEvent.click(hostSeat);
    expect(screen.queryByText(/Kick You from the room/i)).toBeNull();

    const guestSeat = screen.getByRole('listitem', { name: 'Ben' });
    expect(guestSeat.tagName).toBe('BUTTON');
    fireEvent.click(guestSeat);
    expect(screen.getByText(/Kick Ben from the room/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Kick' }));
    expect(harness.socket.lastSent('player:kick')).toEqual({
      type: 'player:kick',
      playerId: 'ben',
    });
  });

  it('Should put the seat number to the left of the player name', () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('language', 'fa');
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 4, ready: false }),
        ],
      }),
    );

    const guest = screen.getByRole('listitem', { name: 'Ben' });
    expect(guest.textContent).toMatch(/^شماره ۵Ben/);
    expect(guest.querySelector('[dir="ltr"]')?.getAttribute('dir')).toBe('ltr');
  });

  it('Should pack lobby portraits only when the room holds ten', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        maxPlayers: 10,
        players: [makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true })],
      }),
    );
    expect(screen.getByRole('list').className).toMatch(/seatsPacked/);
    expect(screen.getByRole('listitem', { name: 'You' }).className).toMatch(
      /compact/,
    );

    harness.pushState(
      makeView({
        hostId: 'you',
        maxPlayers: 7,
        players: [makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true })],
      }),
    );
    expect(screen.getByRole('list').className).not.toMatch(/seatsPacked/);
    expect(screen.getByRole('listitem', { name: 'You' }).className).not.toMatch(
      /compact/,
    );
  });

  it('Should ask before leaving the room when the shared back action fires', () => {
    const harness = buildHarness({ seated: true });
    harness.services.nav.navigate('waiting-room');
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        players: [makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true })],
      }),
    );

    harness.services.nav.requestBack();
    expect(screen.getByText(en.leaveDialog.hostMessage)).toBeTruthy();
    expect(harness.services.nav.screen()).toBe('waiting-room');
  });

  it('Should navigate to the game board once the lobby phase ends', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(makeView({ hostId: 'you', phase: Phase.Lobby }));
    expect(harness.services.nav.screen()).not.toBe('game');

    harness.pushState(makeView({ hostId: 'you', phase: Phase.Nomination }));
    expect(harness.services.nav.screen()).toBe('game');
  });
});
