import { afterEach, describe, expect, it } from '@rstest/core';
import { fireEvent, screen, waitFor } from '@solidjs/testing-library';
import {
  ConnectionNotice,
  RECONNECT_GIVE_UP_MS,
  RECONNECT_NOTICE_GRACE_MS,
} from './ConnectionNotice';
import { en } from '../../i18n/locales/en';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

afterEach(() => {
  window.dispatchEvent(new Event('online'));
});

describe('ConnectionNotice', () => {
  it('Should stay quiet while the socket is up', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <ConnectionNotice />, harness);

    expect(screen.queryByText(en.connection.lost)).toBeNull();
  });

  it('Should wait the grace before covering the table', () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <ConnectionNotice />, harness);
    harness.socket.setStatus('disconnected');

    expect(screen.queryByText(en.connection.lost)).toBeNull();
  });

  it('Should tell the player it is reconnecting, with no buttons', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <ConnectionNotice />, harness);
    harness.socket.setStatus('disconnected');

    await waitFor(
      () => {
        expect(screen.getByText(en.connection.lost)).toBeTruthy();
      },
      { timeout: RECONNECT_NOTICE_GRACE_MS + 500 },
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('Should keep the notice through a connecting retry', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <ConnectionNotice />, harness);
    harness.socket.setStatus('disconnected');

    await waitFor(
      () => {
        expect(screen.getByText(en.connection.lost)).toBeTruthy();
      },
      { timeout: RECONNECT_NOTICE_GRACE_MS + 500 },
    );

    harness.socket.setStatus('connecting');
    expect(screen.getByText(en.connection.lost)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('Should close when the socket comes back', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <ConnectionNotice />, harness);
    harness.socket.setStatus('disconnected');

    await waitFor(
      () => {
        expect(screen.getByText(en.connection.lost)).toBeTruthy();
      },
      { timeout: RECONNECT_NOTICE_GRACE_MS + 500 },
    );

    harness.socket.setStatus('connected');
    await waitFor(() => {
      expect(screen.queryByText(en.connection.lost)).toBeNull();
    });
  });

  it('Should stay out of the way of the room-closed notice', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <ConnectionNotice />, harness);
    harness.socket.emit({ type: 'room:closed', reason: 'HOST_LEFT' });
    harness.socket.setStatus('disconnected');

    await new Promise((resolve) =>
      setTimeout(resolve, RECONNECT_NOTICE_GRACE_MS + 200),
    );
    expect(screen.queryByText(en.connection.lost)).toBeNull();
  });

  it('Should tell a player on the lobby when the browser goes offline', async () => {
    const harness = buildHarness();
    renderWithApp(() => <ConnectionNotice />, harness);

    expect(screen.queryByText(en.connection.lost)).toBeNull();
    window.dispatchEvent(new Event('offline'));

    await waitFor(
      () => {
        expect(screen.getByText(en.connection.lost)).toBeTruthy();
      },
      { timeout: RECONNECT_NOTICE_GRACE_MS + 500 },
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('Should close the lobby notice when the browser is back', async () => {
    const harness = buildHarness();
    renderWithApp(() => <ConnectionNotice />, harness);
    window.dispatchEvent(new Event('offline'));

    await waitFor(
      () => {
        expect(screen.getByText(en.connection.lost)).toBeTruthy();
      },
      { timeout: RECONNECT_NOTICE_GRACE_MS + 500 },
    );

    window.dispatchEvent(new Event('online'));
    await waitFor(() => {
      expect(screen.queryByText(en.connection.lost)).toBeNull();
    });
  });

  it('Should not cover the table after the player has left', async () => {
    const harness = buildHarness({ seated: true });
    renderWithApp(() => <ConnectionNotice />, harness);
    harness.services.game.leaveRoom();
    harness.socket.setStatus('disconnected');

    await new Promise((resolve) =>
      setTimeout(resolve, RECONNECT_NOTICE_GRACE_MS + 200),
    );
    expect(screen.queryByText(en.connection.lost)).toBeNull();
  });

  it(
    'Should offer to reopen after ten seconds',
    async () => {
      const harness = buildHarness();
      let reloads = 0;
      renderWithApp(
        () => <ConnectionNotice onReload={() => { reloads += 1; }} />,
        harness,
      );
      window.dispatchEvent(new Event('offline'));

      await waitFor(
        () => {
          expect(screen.getByText(en.connection.failed)).toBeTruthy();
        },
        { timeout: RECONNECT_GIVE_UP_MS + 1500 },
      );
      expect(screen.getByRole('button', { name: en.connection.reload })).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: en.connection.reload }));
      expect(reloads).toBe(1);
    },
    RECONNECT_GIVE_UP_MS + 3000,
  );
});
