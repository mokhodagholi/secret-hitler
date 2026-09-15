import { describe, expect, it, beforeEach } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import { DEFAULT_FLAGS, Phase } from '@secret-hitler/shared';
import { ChatPanel } from './ChatPanel';
import { en } from '../../i18n/locales/en';
import {
  buildHarness,
  makePlayer,
  makeView,
  renderWithApp,
  stubDeniedMicrophone,
  stubGrantedMicrophone,
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

function emitChat(
  harness: ReturnType<typeof buildHarness>,
  text: string,
  id = 'm1',
) {
  harness.socket.emit({
    type: 'chat',
    message: { id, playerId: 'sadf', name: 'sadf', text, at: 0 },
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

  it('Should keep the feed where it is when the reader has scrolled up', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());
    emitChat(harness, 'first');

    const feed = screen.getByText('first').closest('[aria-hidden]') as HTMLElement;
    Object.defineProperty(feed, 'scrollHeight', { configurable: true, value: 500 });
    Object.defineProperty(feed, 'clientHeight', { configurable: true, value: 100 });
    feed.scrollTop = 0;
    fireEvent.scroll(feed);

    emitChat(harness, 'second', 'm2');
    expect(feed.scrollTop).toBe(0);
  });

  it('Should follow a new line when the feed is already at the bottom', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());
    emitChat(harness, 'first');

    const feed = screen.getByText('first').closest('[aria-hidden]') as HTMLElement;
    Object.defineProperty(feed, 'scrollHeight', { configurable: true, value: 500 });
    Object.defineProperty(feed, 'clientHeight', { configurable: true, value: 100 });
    feed.scrollTop = 400;
    fireEvent.scroll(feed);

    emitChat(harness, 'second', 'm2');
    expect(feed.scrollTop).toBe(500);
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

  it('Should wait seven seconds before the next chat message', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());

    const input = screen.getByPlaceholderText(en.game.chatPlaceholder);
    fireEvent.input(input, { target: { value: 'first' } });
    fireEvent.click(screen.getByRole('button', { name: en.game.send }));

    fireEvent.input(screen.getByPlaceholderText(/Wait 7s/), {
      target: { value: 'too soon' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: en.game.chatSlowWait.replace('{seconds}', '7'),
      }),
    );

    expect(
      harness.socket.sent.filter((message) => message.type === 'chat:message'),
    ).toHaveLength(1);
    expect(screen.getByText('7')).toBeTruthy();
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

  it('Should size the dock from its height so the table can shrink above it', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());

    const panel = screen.getByLabelText(en.game.chat);
    expect(panel.style.height).toBe('280px');
    expect(panel.style.flexBasis).toBe('280px');
  });

  it('Should keep the composer when the feed is collapsed to the composer step', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());

    fireEvent.dblClick(screen.getByRole('separator'));
    expect(screen.getByPlaceholderText(en.game.chatPlaceholder)).toBeTruthy();
    expect(screen.getByLabelText(en.game.chat).style.height).toBe('152px');
  });

  it('Should hide the composer when the panel is collapsed to the header', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());

    fireEvent.dblClick(screen.getByRole('separator'));
    fireEvent.dblClick(screen.getByRole('separator'));
    expect(screen.queryByPlaceholderText(en.game.chatPlaceholder)).toBeNull();
    expect(screen.queryByText(en.game.chat)).toBeNull();
  });

  it('Should keep the microphone off the chrome while the voice flag is off', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());

    expect(screen.queryByRole('button', { name: en.game.unmuteSelf })).toBeNull();
    expect(screen.queryByRole('button', { name: en.game.muteSelf })).toBeNull();
  });

  it('Should show the microphone after /api/flags turns voice on', async () => {
    stubDeniedMicrophone();
    const harness = buildHarness({
      seated: true,
      flags: DEFAULT_FLAGS,
      flagFetch: async () =>
        new Response(JSON.stringify({ flags: { voice: true } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });
    renderPanel(harness);
    harness.pushState(seatedView());

    expect(screen.queryByRole('button', { name: en.game.unmuteSelf })).toBeNull();
    await harness.services.flags.load();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: en.game.unmuteSelf })).toBeTruthy();
    });
  });

  it('Should show the microphone when auth turns voice on', async () => {
    stubDeniedMicrophone();
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    harness.pushState(seatedView());

    expect(screen.queryByRole('button', { name: en.game.unmuteSelf })).toBeNull();
    harness.socket.emit({
      type: 'authed',
      playerId: 'you',
      flags: { ...DEFAULT_FLAGS, voice: true },
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: en.game.unmuteSelf })).toBeTruthy();
    });
  });

  it('Should toggle table mute from the chat chrome when the voice flag is on', async () => {
    stubGrantedMicrophone();
    const harness = buildHarness({ seated: true, flags: { voice: true } });
    renderPanel(harness);
    harness.pushState(seatedView());
    await waitFor(() => {
      expect(harness.socket.lastSent('voice:join')).toEqual({ type: 'voice:join' });
    });

    const mic = screen.getByRole('button', { name: en.game.unmuteSelf });
    fireEvent.click(mic);
    await waitFor(() => {
      expect(harness.socket.lastSent('voice:mute')).toEqual({
        type: 'voice:mute',
        muted: false,
      });
    });
    expect(screen.getByRole('button', { name: en.game.muteSelf })).toBeTruthy();

    fireEvent.pointerDown(mic, { button: 0 });
    fireEvent.click(mic);
    await waitFor(() => {
      expect(harness.socket.lastSent('voice:mute')).toEqual({
        type: 'voice:mute',
        muted: true,
      });
    });
    expect(screen.getByRole('button', { name: en.game.unmuteSelf })).toBeTruthy();
  });

  it('Should keep ballots out of the chat feed during a vote', () => {
    const harness = buildHarness({ seated: true });
    renderPanel(harness);
    const view = seatedView();
    harness.pushState({
      ...view,
      phase: Phase.Voting,
      you: { ...view.you, vote: 'ja' },
      players: view.players.map((player) =>
        player.id === 'you' || player.id === 'sadf'
          ? { ...player, hasVoted: true }
          : player,
      ),
    });

    expect(document.querySelector('[data-chat-ballot]')).toBeNull();
  });
});
