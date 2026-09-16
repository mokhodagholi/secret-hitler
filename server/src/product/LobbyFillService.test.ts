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

    service.dispose();
    await app.close();
  });

  it('Should not invite for a 2-seat lobby', async () => {
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

    const entry = repo.create({ name: 'Too small' });
    entry.engine.addPlayer('A', false, 0, 'bale:1');
    entry.engine.addPlayer('B', false, 0, 'bale:2');

    await service.sweep();
    clock += LOBBY_FILL.waitBeforeInviteMs + 1;
    await service.sweep();

    expect(sent).toEqual([]);
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
