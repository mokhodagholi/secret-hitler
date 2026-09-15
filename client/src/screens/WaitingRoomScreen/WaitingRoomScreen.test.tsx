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

  it('Should keep an empty seat for every open place in the room', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        maxPlayers: 7,
        players: [makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true })],
      }),
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByRole('listitem', { name: 'You' })).toBeTruthy();
    expect(
      screen.getAllByRole('listitem', { name: en.waiting.waitingForPlayers }),
    ).toHaveLength(6);
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

    expect(screen.getByRole('status').textContent).toBe(en.tip.chaos);
    expect(screen.queryByRole('button', { name: en.leaveDialog.confirm })).toBeNull();

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

  it('Should ignore an in-game snapshot that belongs to a previous room', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({ hostId: 'you', phase: Phase.Nomination, roomId: 'other-room' }),
    );
    expect(harness.services.nav.screen()).not.toBe('game');
  });

  it('Should show Start without Ready on the public table', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        kind: 'public',
        hostId: '',
        you: { id: 'you', role: null, vote: null, policies: [], peek: [], investigation: null },
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0, ready: false }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 1, ready: false }),
        ],
      }),
    );

    expect(screen.queryByRole('button', { name: "I'm Ready" })).toBeNull();
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
    expect(screen.getByText(en.waiting.startHint)).toBeTruthy();
  });

  it('Should send want-start when a public sitter taps Start', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        kind: 'public',
        hostId: '',
        you: { id: 'you', role: null, vote: null, policies: [], peek: [], investigation: null },
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0, ready: true }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 1, ready: true }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(harness.socket.lastSent('player:wantStart')).toEqual({
      type: 'player:wantStart',
    });
  });

  it('Should disable Start while the public cooldown is running', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        kind: 'public',
        hostId: '',
        you: {
          id: 'you',
          role: null,
          vote: null,
          policies: [],
          peek: [],
          investigation: null,
          wantStartCooldownUntil: Date.now() + 180_000,
        },
        players: [makePlayer({ id: 'you', name: 'You', seat: 0 })],
      }),
    );

    const start = screen.getByRole('button', { name: 'Start' });
    expect((start as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/You can tap Start again in 3 minutes/)).toBeTruthy();
  });

  it('Should force holdouts to tap Start when half the table already has', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        kind: 'public',
        hostId: '',
        startChoice: { startedAt: 1, endsAt: Date.now() + 20_000 },
        you: { id: 'you', role: null, vote: null, policies: [], peek: [], investigation: null },
        players: [
          makePlayer({ id: 'ben', name: 'Ben', seat: 0, ready: true, wantsStart: true }),
          makePlayer({ id: 'you', name: 'You', seat: 1, ready: true, wantsStart: false }),
        ],
      }),
    );

    expect(screen.getByText(en.waiting.startChoiceHoldout)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(harness.socket.lastSent('player:wantStart')).toEqual({
      type: 'player:wantStart',
    });
  });

  it('Should open a kick vote from a public-table seat', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        kind: 'public',
        hostId: '',
        you: {
          id: 'you',
          role: null,
          vote: null,
          policies: [],
          peek: [],
          investigation: null,
          canRequestKick: true,
        },
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0 }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 1 }),
          makePlayer({ id: 'cal', name: 'Cal', seat: 2 }),
        ],
      }),
    );

    fireEvent.click(screen.getByRole('listitem', { name: 'Ben' }));
    fireEvent.click(screen.getByRole('button', { name: en.game.playerMenu.report }));
    fireEvent.click(screen.getByRole('button', { name: en.game.kickVote.request }));
    expect(harness.socket.lastSent('kick:request')).toEqual({
      type: 'kick:request',
      playerId: 'ben',
    });
  });

  it('Should show the kick-vote overlay in the public waiting room', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        kind: 'public',
        hostId: '',
        you: { id: 'you', role: null, vote: null, policies: [], peek: [], investigation: null },
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0 }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 1 }),
          makePlayer({ id: 'cal', name: 'Cal', seat: 2 }),
        ],
        kickVote: {
          requesterId: 'cal',
          targetId: 'ben',
          startedAt: 1,
          endsAt: Date.now() + 30_000,
          votedCount: 1,
          voterCount: 2,
          needed: 2,
          yourVote: null,
          votedIds: ['cal'],
        },
      }),
    );

    expect(screen.getByRole('dialog', { name: en.game.kickVote.title })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en.game.voteJa }));
    expect(harness.socket.lastSent('kick:vote')).toEqual({
      type: 'kick:vote',
      agree: true,
    });
  });

  it('Should send a lobby chat line the player types', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(makeView({ hostId: 'you' }));

    const input = screen.getByPlaceholderText(en.game.chatPlaceholder);
    fireEvent.input(input, { target: { value: 'hello lobby' } });
    fireEvent.click(screen.getByRole('button', { name: en.game.send }));

    expect(harness.socket.lastSent('chat:message')).toEqual({
      type: 'chat:message',
      text: 'hello lobby',
    });
  });

  it('Should show the player’s own lobby message and another seat’s', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        players: [
          makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true }),
          makePlayer({ id: 'ben', name: 'Ben', seat: 1 }),
        ],
      }),
    );

    harness.socket.emit({
      type: 'chat',
      message: { id: 'm1', playerId: 'ben', name: 'Ben', text: 'see you soon', at: 0 },
    });
    harness.socket.emit({
      type: 'chat',
      message: { id: 'm2', playerId: 'you', name: 'You', text: 'already here', at: 1 },
    });

    expect(screen.getByText('see you soon')).toBeTruthy();
    expect(screen.getByText('already here')).toBeTruthy();
    const theirs = screen.getByText('see you soon').closest('article');
    const mine = screen.getByText('already here').closest('article');
    expect(theirs?.textContent).toContain('Ben');
    expect(mine?.textContent).toContain(en.game.you);
    expect(mine?.className).toMatch(/mine/);
    expect(theirs?.className).not.toMatch(/mine/);
  });

  it('Should keep the lobby composer from inviting browser suggest', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(makeView({ hostId: 'you' }));

    const field = screen.getByPlaceholderText(en.game.chatPlaceholder);
    expect(field.getAttribute('autocomplete')).toBe('off');
    expect(field.getAttribute('autocorrect')).toBe('off');
    expect(field.getAttribute('spellcheck')).toBe('false');
    expect(field.getAttribute('enterkeyhint')).toBe('send');
  });

  it('Should keep the quote card height stable for long and short tips', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <WaitingRoomScreen />, harness);
    harness.pushState(
      makeView({
        hostId: 'you',
        players: [makePlayer({ id: 'you', name: 'You', seat: 0, isHost: true })],
      }),
    );

    const card = document.querySelector('[data-lobby-tip]');
    expect(card).toBeTruthy();
    expect(card?.getAttribute('data-line-clamp')).toBe('3');
    expect(screen.getByRole('status').textContent).toBe(en.tip.chaos);

    const sizer = card?.querySelector('[aria-hidden="true"]');
    expect(sizer?.textContent).toContain(en.tip.chaos);
    expect(sizer?.textContent).toContain(en.tip.whoTheyCover);
    expect(sizer?.textContent).toContain(en.tip.night);

    const line = screen.getByRole('status').querySelector('span');
    expect(line?.className).toMatch(/tipLine/);
  });
});
