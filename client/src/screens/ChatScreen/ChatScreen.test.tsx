import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { Phase } from '@secret-hitler/shared';
import { ChatScreen } from './ChatScreen';
import { en } from '../../i18n/locales/en';
import {
  buildHarness,
  makePlayer,
  makeView,
  renderWithApp,
} from '../../../test/test-utils';

function seatedView() {
  return makeView({
    phase: Phase.Nomination,
    players: [
      makePlayer({ id: 'you', name: 'You', seat: 0 }),
      makePlayer({ id: 'sadf', name: 'sadf', seat: 1 }),
    ],
  });
}

function emitChat(harness: ReturnType<typeof buildHarness>, text: string) {
  harness.socket.emit({
    type: 'chat',
    message: { id: 'm1', playerId: 'sadf', name: 'sadf', text, at: 0 },
  });
}

describe('ChatScreen', () => {
  it('Should render an incoming chat message with its author', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <ChatScreen />, harness);
    harness.pushState(seatedView());
    emitChat(harness, 'hello table');

    expect(screen.getByText('hello table')).toBeTruthy();
    expect(screen.getByText('sadf')).toBeTruthy();
  });

  it('Should send a chat message the player types', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <ChatScreen />, harness);
    harness.pushState(seatedView());

    const input = screen.getByPlaceholderText(en.game.chatPlaceholder);
    fireEvent.input(input, { target: { value: 'my move' } });
    fireEvent.click(screen.getByRole('button', { name: en.game.send }));

    expect(harness.socket.lastSent('chat:message')).toEqual({
      type: 'chat:message',
      text: 'my move',
    });
  });

  it('Should show the discussion countdown while discussion is open', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <ChatScreen />, harness);
    harness.pushState({
      ...seatedView(),
      discussionDeadline: { startedAt: 0, endsAt: Date.now() + 15_000 },
      nominationDeadline: null,
    });

    expect(screen.getByText(/^\d+:\d{2}$/)).toBeTruthy();
  });

  it('Should clear the unread chat count while open', () => {
    const harness = buildHarness({ seated: true });
    // A message arrives before the page is opened.
    emitChat(harness, 'earlier');
    expect(harness.services.game.unreadChat()).toBe(1);

    renderWithApp(() => <ChatScreen />, harness);
    harness.pushState(seatedView());

    expect(harness.services.game.unreadChat()).toBe(0);
  });
});
