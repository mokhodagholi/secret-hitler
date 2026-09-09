import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { Phase } from '@secret-hitler/shared';
import { WaitingRoomScreen } from './WaitingRoomScreen';
import { buildHarness, makePlayer, makeView, renderWithApp } from '../../../test/test-utils';

describe('WaitingRoomScreen', () => {
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
      screen.getByText(/Every player must be ready before the game can start/i),
    ).toBeTruthy();
    expect(harness.socket.lastSent('game:start')).toBeUndefined();
  });

  it('Should enable the host start button once the room is ready', () => {
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

  it('Should navigate to the game board once the lobby phase ends', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(makeView({ hostId: 'you', phase: Phase.Lobby }));
    expect(harness.services.nav.screen()).not.toBe('game');

    harness.pushState(makeView({ hostId: 'you', phase: Phase.Nomination }));
    expect(harness.services.nav.screen()).toBe('game');
  });
});
