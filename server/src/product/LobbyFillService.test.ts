import { describe, expect, it } from '@rstest/core';
import type { BaleMessenger } from 'bale-bot';
import { DEFAULT_FLAGS } from '@secret-hitler/shared';
import { buildServer } from '../app';
import { BaleSeatIndex } from '../bale/BaleSeatIndex';
import { InMemoryProductStore } from './InMemoryProductStore';
import { LobbyFillService } from './LobbyFillService';
import { LOBBY_FILL } from './lobbyFill';

describe('LobbyFillService', () => {
  it('Should DM warm users after a needy lobby has waited', async () => {
    const product = new InMemoryProductStore();
    const now = Date.now();
    await product.recordEvent({
      name: 'find_match',
      at: new Date(now - 20 * 60_000),
      platform: 'bale',
      userKey: 'bale:42',
    });

    const sent: { chat_id: number; text: string }[] = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push({ chat_id: Number(params.chat_id), text: String(params.text) });
        return { message_id: sent.length };
      },
    };

    const { app, repo, sockets } = await buildServer({
      flags: { ...DEFAULT_FLAGS, lobbyFill: false },
      product,
    });

    let clock = now;
    const service = new LobbyFillService({
      repo,
      sockets,
      product,
      bale: {
        bot,
        botToken: 't',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
      now: () => clock,
      sendDelayMs: 0,
    });

    const entry = repo.create({ name: 'Fill me' });
    entry.engine.addPlayer('A', false, 0, 'bale:1');
    entry.engine.addPlayer('B', false, 0, 'bale:2');
    entry.engine.addPlayer('C', false, 0, 'bale:3');

    await service.sweep();
    expect(sent).toEqual([]);

    clock += LOBBY_FILL.waitBeforeInviteMs + 1;
    await service.sweep();

    expect(sent.some((row) => row.chat_id === 42)).toBe(true);
    expect(sent[0]?.text).toContain('منتظرته');
    expect(sent[0]?.text).toContain('3 نفره');
    expect(
      product.events.some(
        (event) => event.name === 'lobby_fill_invite' && event.userKey === 'bale:42',
      ),
    ).toBe(true);
    const wave = product.events.find((event) => event.name === 'lobby_fill_wave');
    expect(wave?.payload).toMatchObject({
      seats: 3,
      invited: 1,
      failed: 0,
      candidates: 1,
      stop: 'done',
    });

    service.dispose();
    await app.close();
  });

  it('Should DM warm users for a 2-seat lobby', async () => {
    const product = new InMemoryProductStore();
    const now = Date.now();
    await product.recordEvent({
      name: 'find_match',
      at: new Date(now - 20 * 60_000),
      platform: 'bale',
      userKey: 'bale:42',
    });

    const sent: { chat_id: number; text: string }[] = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push({ chat_id: Number(params.chat_id), text: String(params.text) });
        return { message_id: sent.length };
      },
    };

    const { app, repo, sockets } = await buildServer({
      flags: { ...DEFAULT_FLAGS, lobbyFill: false },
      product,
    });

    let clock = now;
    const service = new LobbyFillService({
      repo,
      sockets,
      product,
      bale: {
        bot,
        botToken: 't',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
      now: () => clock,
      sendDelayMs: 0,
    });

    const entry = repo.create({ name: 'Pair waiting' });
    entry.engine.addPlayer('A', false, 0, 'bale:1');
    entry.engine.addPlayer('B', false, 0, 'bale:2');

    await service.sweep();
    expect(sent).toEqual([]);

    clock += LOBBY_FILL.waitBeforeInviteMs + 1;
    await service.sweep();

    expect(sent.some((row) => row.chat_id === 42)).toBe(true);
    expect(sent[0]?.text).toContain('2 نفره');
    const wave = product.events.find((event) => event.name === 'lobby_fill_wave');
    expect(wave?.payload).toMatchObject({
      seats: 2,
      invited: 1,
      failed: 0,
      candidates: 1,
      stop: 'done',
    });

    service.dispose();
    await app.close();
  });

  it('Should not invite for a 1-seat lobby', async () => {
    const product = new InMemoryProductStore();
    const now = Date.now();
    await product.recordEvent({
      name: 'find_match',
      at: new Date(now - 20 * 60_000),
      platform: 'bale',
      userKey: 'bale:42',
    });

    const sent: { chat_id: number; text: string }[] = [];
    const bot: BaleMessenger = {
      sendMessage: async (params) => {
        sent.push({ chat_id: Number(params.chat_id), text: String(params.text) });
        return { message_id: sent.length };
      },
    };

    const { app, repo, sockets } = await buildServer({
      flags: { ...DEFAULT_FLAGS, lobbyFill: false },
      product,
    });

    let clock = now;
    const service = new LobbyFillService({
      repo,
      sockets,
      product,
      bale: {
        bot,
        botToken: 't',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
      now: () => clock,
      sendDelayMs: 0,
    });

    const entry = repo.create({ name: 'Solo host' });
    entry.engine.addPlayer('A', false, 0, 'bale:1');

    await service.sweep();
    clock += LOBBY_FILL.waitBeforeInviteMs + 1;
    await service.sweep();

    expect(sent).toEqual([]);
    expect(product.events.some((event) => event.name === 'lobby_fill_wave')).toBe(false);
    expect(product.events.some((event) => event.name === 'lobby_fill_invite')).toBe(false);
    service.dispose();
    await app.close();
  });

  it('Should record fail and wave when the messenger rejects a DM', async () => {
    const product = new InMemoryProductStore();
    const now = Date.now();
    await product.recordEvent({
      name: 'find_match',
      at: new Date(now - 20 * 60_000),
      platform: 'bale',
      userKey: 'bale:42',
    });

    const bot: BaleMessenger = {
      sendMessage: async () => {
        const error = new Error('Too Many Requests') as Error & { errorCode: number };
        error.errorCode = 429;
        throw error;
      },
    };

    const { app, repo, sockets } = await buildServer({
      flags: { ...DEFAULT_FLAGS, lobbyFill: false },
      product,
    });

    let clock = now;
    const service = new LobbyFillService({
      repo,
      sockets,
      product,
      bale: {
        bot,
        botToken: 't',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
      now: () => clock,
      sendDelayMs: 0,
    });

    const entry = repo.create({ name: 'Fill me' });
    entry.engine.addPlayer('A', false, 0, 'bale:1');
    entry.engine.addPlayer('B', false, 0, 'bale:2');
    entry.engine.addPlayer('C', false, 0, 'bale:3');

    await service.sweep();
    clock += LOBBY_FILL.waitBeforeInviteMs + 1;
    await service.sweep();

    expect(
      product.events.some(
        (event) =>
          event.name === 'lobby_fill_fail' &&
          event.userKey === 'bale:42' &&
          event.payload?.reason === 'rate_limit',
      ),
    ).toBe(true);
    expect(
      product.events.some(
        (event) =>
          event.name === 'lobby_fill_wave' &&
          event.payload?.invited === 0 &&
          event.payload?.failed === 1,
      ),
    ).toBe(true);
    expect(product.events.some((event) => event.name === 'lobby_fill_invite')).toBe(false);

    service.dispose();
    await app.close();
  });

  it('Should not start the service when the flag is off', async () => {
    const { app, lobbyFill } = await buildServer({
      flags: { ...DEFAULT_FLAGS, lobbyFill: false },
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: 't',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    expect(lobbyFill).toBeNull();
    await app.close();
  });

  it('Should start the service when the flag is on and a messenger exists', async () => {
    const { app, lobbyFill } = await buildServer({
      flags: { ...DEFAULT_FLAGS, lobbyFill: true },
      bale: {
        bot: { sendMessage: async () => ({}) },
        botToken: 't',
        botUsername: '@secret_hitler_bot',
        seats: new BaleSeatIndex(),
      },
    });
    expect(lobbyFill).not.toBeNull();
    await app.close();
  });
});
