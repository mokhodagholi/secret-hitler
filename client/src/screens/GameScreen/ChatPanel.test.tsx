import { describe, expect, it, beforeEach } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { Phase } from '@secret-hitler/shared';
import { ChatPanel } from './ChatPanel';
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

function renderPanel(harness: ReturnType<typeof buildHarness>) {
  return renderWithApp(
    () => <ChatPanel onOpenPlayers={() => {}} onOpenMenu={() => {}} />,
    harness,
  );
}

describe('ChatPanel', () => {
  beforeEach(() => {
    try {
      localStorage.removeItem('sh:chat-panel-height');
    } catch {
      /* jsdom */
    }
  });
  it('Should render an incoming chat message with its author', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());
    emitChat(harness, 'hello table');

    expect(screen.getByText('hello table')).toBeTruthy();
    expect(screen.getByText('sadf')).toBeTruthy();
  });

  it('Should keep a long chat line in the feed, not clip it', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());
    const line =
      'this is a long table message that used to vanish after three lines of chat';
    emitChat(harness, line);

    expect(screen.getByText(line)).toBeTruthy();
  });

  it('Should keep a glued join link inside the bubble', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());
    const line =
      'http://localhost:3000/join/MWXJGKhttp://localhost:3000/join/MWXJGK';
    emitChat(harness, line);

    const text = screen.getByText(line);
    expect(text.className).toMatch(/text/);
    expect(text.closest('div')?.className).toMatch(/bubble/);
  });

  it('Should keep the composer from inviting browser suggest', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());

    const field = screen.getByPlaceholderText(en.game.chatPlaceholder);
    expect(field.getAttribute('autocomplete')).toBe('off');
    expect(field.getAttribute('autocorrect')).toBe('off');
    expect(field.getAttribute('spellcheck')).toBe('false');
    expect(field.getAttribute('enterkeyhint')).toBe('send');
  });

  it('Should keep the send action disabled until the player types', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());

    const send = screen.getByRole('button', { name: en.game.send });
    expect(send).toHaveProperty('disabled', true);

    fireEvent.input(screen.getByPlaceholderText(en.game.chatPlaceholder), {
      target: { value: 'my move' },
    });
    expect(send).toHaveProperty('disabled', false);
  });

  it('Should send a chat message the player types', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
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
    renderPanel(harness);
    harness.pushState({
      ...seatedView(),
      discussionDeadline: { startedAt: 0, endsAt: Date.now() + 15_000 },
      nominationDeadline: null,
    });

    expect(screen.getByText(/^\d+:\d{2}$/)).toBeTruthy();
  });

  it('Should clear the unread chat count while the panel can show the feed', () => {
    const harness = buildHarness({ seated: true });
    emitChat(harness, 'earlier');
    expect(harness.services.game.unreadChat()).toBe(1);

    renderPanel(harness);
    harness.pushState(seatedView());

    expect(harness.services.game.unreadChat()).toBe(0);
  });

  it('Should keep the composer silent when talking is not allowed', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(
      () => (
        <ChatPanel
          talkingAllowed={false}
          onOpenPlayers={() => {}}
          onOpenMenu={() => {}}
        />
      ),
      harness,
    );
    harness.pushState(seatedView());

    const input = screen.getByPlaceholderText(en.game.chatSilentPlaceholder);
    expect(input).toHaveProperty('disabled', true);
    fireEvent.input(input, { target: { value: 'psst' } });
    expect(harness.socket.lastSent('chat:message')).toBeUndefined();
  });

  it('Should put the viewer’s messages on the right and others on the left', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());
    emitChat(harness, 'hello table');
    harness.socket.emit({
      type: 'chat',
      message: { id: 'm2', playerId: 'you', name: 'You', text: 'my line', at: 1 },
    });

    const theirs = screen.getByText('hello table').closest('article');
    const mine = screen.getByText('my line').closest('article');
    expect(theirs?.className).not.toMatch(/mine/);
    expect(mine?.className).toMatch(/mine/);
    expect(mine?.querySelector('time')).toBeTruthy();
  });

  it('Should put the composer placeholder and send action on the trailing edge', () => {
    const harness = buildHarness({ seated: true });
    harness.services.settings.set('language', 'fa');
    renderPanel(harness);
    harness.pushState(seatedView());

    const input = screen.getByPlaceholderText(
      harness.services.i18n.formatMessage('game.chatPlaceholder'),
    );
    expect(input.getAttribute('dir')).toBe('rtl');
    expect(screen.getByRole('button', { name: harness.services.i18n.formatMessage('game.send') })).toBeTruthy();
  });

  it('Should show the Choose Chancellor action instead of a Chat title', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(
      () => (
        <ChatPanel
          actionLabel={en.game.startNomination}
          onAction={() => {}}
          onOpenPlayers={() => {}}
          onOpenMenu={() => {}}
        />
      ),
      harness,
    );
    harness.pushState(seatedView());

    expect(screen.queryByText(en.game.chat)).toBeNull();
    expect(
      screen.getByRole('button', { name: en.game.startNomination }),
    ).toBeTruthy();
  });

  it('Should hide the composer when the panel is collapsed to the header', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());

    fireEvent.dblClick(screen.getByRole('separator'));
    expect(screen.queryByPlaceholderText(en.game.chatPlaceholder)).toBeNull();
    expect(screen.queryByText(en.game.chat)).toBeNull();
  });
});
